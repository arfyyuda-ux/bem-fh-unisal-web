import pytest
from pydantic import ValidationError

from models.content import SettingsUpdate


def test_home_news_limit_defaults_to_four_and_accepts_admin_value():
    assert SettingsUpdate().home_news_limit == 4
    assert SettingsUpdate(home_news_limit=7).home_news_limit == 7


@pytest.mark.parametrize("limit", [0, 13])
def test_home_news_limit_rejects_values_outside_supported_range(limit):
    with pytest.raises(ValidationError):
        SettingsUpdate(home_news_limit=limit)
