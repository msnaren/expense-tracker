import os
import re

dir_path = r"c:\Users\user\OneDrive - Rathinam Group Of Institutions\Desktop\EXPENSE TRACKER\backend\routers"

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. func.strftime('%m', Transaction.transaction_date) == f"{month:02d}" -> func.extract('month', Transaction.transaction_date) == month
    # 2. func.strftime('%Y', Transaction.transaction_date) == str(year) -> func.extract('year', Transaction.transaction_date) == year
    # It's better to just do regex for the strftime part.

    # Pattern for month: func.strftime('%m', Transaction.transaction_date) == <expr>
    # We will replace it with func.extract('month', Transaction.transaction_date) == int(<expr>) or similar.
    # Actually, it's safer to just do it manually for each file since there are only 4 files.
    pass
