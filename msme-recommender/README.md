# msme-recommender

A hybrid product recommendation service for the MSME marketplace. FastAPI, port 8000.
It reads the marketplace MongoDB **read-only** and never writes to it.

This service replaces a hardcoded `1.4` constant in the Node seller forecast that was
commented `// Simulated XGBoost trend boost`. There was no XGBoost, and no model.

## Method

**Content-based** (`app/content.py`)
TF-IDF over `name + description + category` (category is repeated so it is not drowned
out by a long description), unigrams and bigrams, English stop words removed. Cosine
similarity across the resulting matrix, self-similarity zeroed.

**Collaborative** (`app/collab.py`)
A buyer x product co-purchase matrix built from the `orders` collection. Buyers are
grouped, so two products bought by the same person are linked whether that was one
order or two. Only buyers with 2+ distinct products contribute signal. Item-item
cosine similarity on the transpose.

**Hybrid** (`app/hybrid.py`)

```
final = CONTENT_WEIGHT * norm(content) + COLLAB_WEIGHT * norm(collab)
```

Both sides are min-max normalised before blending so neither dominates purely because
of its raw scale. Weights come from the environment and default to 0.6 / 0.4; they are
renormalised if they do not sum to 1.

Cold start: when there is no collaborative signal at all — a new catalogue, a product
nobody has bought — the content score carries the result on its own rather than being
scaled down by its weight. Inactive and zero-stock products are filtered out of every
response.

## Results

Measured with `app/eval.py` on a **chronological** 80/20 split of the orders
collection. The split is by time, never random: a random split would let the model see
a buyer's later purchases while predicting their earlier ones, which inflates the score.

| metric | k=5 | k=10 | k=20 |
|---|---|---|---|
| precision@k | 0.0951 | **0.0721** | 0.0680 |
| recall@k | 0.1981 | **0.2896** | 0.5724 |

Evaluated over 61 users, 247 training orders, 62 held-out orders, 200 products.
Weights 0.6 / 0.4.

### What these numbers actually mean

**The dataset is synthetic.** The marketplace database was empty, so
`msme-backend/scripts/seedSynthetic.js` generated 200 products across 8 categories,
150 buyers and 309 orders. Buyers were given a preferred category and draw ~80% of each
basket from it. The evaluation therefore measures whether the algorithm recovers a
structure that was deliberately planted — it is a correctness check on the pipeline, not
evidence about real customer behaviour.

precision@10 of 0.072 means roughly 0.7 of every 10 recommendations was an item the
buyer went on to purchase. recall@10 of 0.29 means about 29% of a buyer's future
purchases appeared in the top 10. For a catalogue of 200 items a random recommender
would score roughly 10/200 = 0.05 recall@10, so the signal is real but modest.

### Limits

- Only 61 of 150 buyers were evaluable; the rest had no purchase history before the
  time cut, or bought nothing new after it.
- Co-purchase is the only collaborative signal. Views, clicks and dwell time are not
  collected anywhere in the platform.
- No temporal decay: a purchase from a year ago counts as much as one from yesterday.
- Cold products with no text and no purchases cannot be recommended at all.
- The index is in memory and rebuilt on startup or `POST /reindex`. There is no
  incremental update, so a newly listed product is invisible until a reindex.

## Endpoints

| method | path | purpose |
|---|---|---|
| GET | `/health` | index sizes and readiness of each model |
| GET | `/recommend/product/{id}?k=10` | similar items |
| GET | `/recommend/user/{id}?k=10` | from that user's orders + wishlist |
| GET | `/recommend/trending?k=10` | popularity fallback |
| POST | `/reindex` | rebuild the index and re-run the evaluation |
| GET | `/metrics` | the most recent evaluation |

## Running it

```bash
cd msme-recommender
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # set MONGO_URL to the same value as msme-backend/.env
.venv/bin/uvicorn app.main:app --port 8000
```

Tests:

```bash
.venv/bin/python -m pytest
```

Docker:

```bash
docker build -t msme-recommender .
docker run --env-file .env -p 8000:8000 msme-recommender
```

## Configuration

| variable | default | meaning |
|---|---|---|
| `MONGO_URL` | — | required; same value as `msme-backend/.env` |
| `MONGO_DB` | from URL | override the database name |
| `CONTENT_WEIGHT` | 0.6 | weight on content-based scores |
| `COLLAB_WEIGHT` | 0.4 | weight on collaborative scores |
| `PORT` | 8000 | service port |

Python 3.11 is required. scikit-learn, numpy and scipy have no prebuilt wheels for
3.14 and will try to build from source.
