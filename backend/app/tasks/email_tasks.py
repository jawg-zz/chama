from app.core.celery_app import celery_app


@celery_app.task
def send_contribution_reminder(chama_name: str, user_email: str, amount: float, due_date: str):
    print(f"[EMAIL REMINDER] To: {user_email} | Chama: {chama_name} | Amount: {amount} | Due: {due_date}")


@celery_app.task
def send_loan_approval_notification(user_email: str, amount: float, status: str):
    print(f"[EMAIL NOTIFICATION] To: {user_email} | Loan: {amount} | Status: {status}")


@celery_app.task
def send_meeting_reminder(user_email: str, meeting_title: str, meeting_date: str):
    print(f"[EMAIL REMINDER] To: {user_email} | Meeting: {meeting_title} | Date: {meeting_date}")
