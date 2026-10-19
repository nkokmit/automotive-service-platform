#!/usr/bin/env python3
"""
Script to seed Qdrant with car news/maintenance articles.

Usage:
    python scripts/seed-data/seed_qdrant.py --file data/car_news.jsonl

Each line in the JSONL file should be:
{
  "title": "...",
  "content": "...",
  "source": "...",
  "url": "...",
  "published_at": "2024-01-01",
  "tags": ["maintenance", "toyota"]
}
"""
from __future__ import annotations
import argparse
import json
import logging
import sys
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    SparseVectorParams,
    SparseIndexParams,
    PointStruct,
    NamedVector,
    NamedSparseVector,
    SparseVector,
)
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

COLLECTION_NAME = "car_news"
DENSE_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DENSE_DIM = 384


def get_client(url: str = "http://localhost:6333") -> QdrantClient:
    return QdrantClient(url=url)


def ensure_collection(client: QdrantClient) -> None:
    """Create the hybrid collection if it doesn't exist."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        logger.info("Collection '%s' already exists, skipping creation.", COLLECTION_NAME)
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={
            "dense": VectorParams(size=DENSE_DIM, distance=Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(
                index=SparseIndexParams(on_disk=False)
            ),
        },
    )
    logger.info("Created hybrid collection '%s'", COLLECTION_NAME)


def embed_articles(articles: list[dict], dense_model: SentenceTransformer) -> list[PointStruct]:
    """Encode articles into Qdrant PointStructs with hybrid vectors."""
    try:
        from fastembed import SparseTextEmbedding
        bm25_model = SparseTextEmbedding(model_name="Qdrant/bm25")
        use_sparse = True
    except ImportError:
        logger.warning("fastembed not installed; using dense-only indexing.")
        use_sparse = False

    texts = [f"{a.get('title', '')} {a.get('content', '')}" for a in articles]
    dense_vecs = dense_model.encode(texts, batch_size=32, show_progress_bar=True)

    if use_sparse:
        sparse_vecs = list(bm25_model.embed(texts))

    points = []
    for i, (article, dense_vec) in enumerate(zip(articles, dense_vecs)):
        vectors = {"dense": dense_vec.tolist()}
        if use_sparse:
            sv = sparse_vecs[i]
            vectors["sparse"] = SparseVector(
                indices=sv.indices.tolist(),
                values=sv.values.tolist(),
            )
        points.append(
            PointStruct(
                id=i,
                vector=vectors,
                payload={
                    "title": article.get("title", ""),
                    "content": article.get("content", ""),
                    "source": article.get("source", ""),
                    "url": article.get("url", ""),
                    "published_at": article.get("published_at", ""),
                    "tags": article.get("tags", []),
                },
            )
        )
    return points


def seed(args: argparse.Namespace) -> None:
    client = get_client(args.qdrant_url)
    ensure_collection(client)

    input_path = Path(args.file)
    if not input_path.exists():
        logger.error("File not found: %s", input_path)
        sys.exit(1)

    articles = [json.loads(line) for line in input_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    logger.info("Loaded %d articles from %s", len(articles), input_path)

    dense_model = SentenceTransformer(DENSE_MODEL_NAME)
    points = embed_articles(articles, dense_model)

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    logger.info("✅ Upserted %d articles into '%s'", len(points), COLLECTION_NAME)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Qdrant car_news collection")
    parser.add_argument("--file", required=True, help="Path to JSONL file of articles")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    seed(parser.parse_args())

