import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_password_reset_email(to: str, link: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Reset your Quizora AI password"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.set_content(
        f"We received a request to reset your Quizora AI password.\n\nReset it here (valid for "
        f"{settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes):\n{link}\n\nIf you did not request this, ignore this email."
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
