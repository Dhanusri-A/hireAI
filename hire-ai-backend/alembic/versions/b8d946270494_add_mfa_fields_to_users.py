"""add_mfa_fields_to_users

Revision ID: b8d946270494
Revises: 0db3d998b75a
Create Date: 2026-03-12 22:27:55.542856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d946270494'
down_revision: Union[str, None] = '0db3d998b75a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mfa_secret', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('mfa_backup_codes', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'mfa_backup_codes')
    op.drop_column('users', 'mfa_enabled')
    op.drop_column('users', 'mfa_secret')