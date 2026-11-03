"""Baseline: create every current table from the ORM metadata.

Future schema changes should get their own revision:
    alembic revision --autogenerate -m "describe change"
    alembic upgrade head
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from app.database import Base
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    from app.database import Base
    Base.metadata.drop_all(bind=op.get_bind())
