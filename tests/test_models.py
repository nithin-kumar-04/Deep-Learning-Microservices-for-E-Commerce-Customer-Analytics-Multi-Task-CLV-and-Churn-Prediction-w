import torch

from src.dl_clv_churn import MultiTaskCLVChurn
from src.dl_recommender import NCFRecommender


def test_multitask_model_output_shapes():
    model = MultiTaskCLVChurn(input_dim=3)
    features = torch.randn(8, 3)

    clv, churn_logits = model(features)

    assert clv.shape == (8, 1)
    assert churn_logits.shape == (8, 1)
    assert torch.all(clv >= 0), "CLV head must not emit negative values"


def test_ncf_model_output_shape():
    model = NCFRecommender(num_users=10, num_items=20, embedding_dim=8)
    users = torch.tensor([0, 1, 2])
    items = torch.tensor([3, 4, 5])

    scores = model(users, items)

    assert scores.shape == (3,)
