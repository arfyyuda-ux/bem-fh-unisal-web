from models.content import SettingsUpdate


def test_social_links_default_empty_and_accept_admin_values():
    defaults = SettingsUpdate()
    assert (defaults.instagram, defaults.x, defaults.youtube, defaults.linkedin) == ("", "", "", "")

    configured = SettingsUpdate(
        instagram="https://instagram.com/bemfhunisal",
        x="https://x.com/bemfhunisal",
        youtube="https://youtube.com/@bemfhunisal",
        linkedin="https://www.linkedin.com/company/bemfhunisal",
    )
    assert (configured.instagram, configured.x, configured.youtube, configured.linkedin) == (
        "https://instagram.com/bemfhunisal",
        "https://x.com/bemfhunisal",
        "https://youtube.com/@bemfhunisal",
        "https://www.linkedin.com/company/bemfhunisal",
    )
