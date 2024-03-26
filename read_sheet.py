import json
with open(r'creds/api_key.json') as f:
    api_key = json.load(f)

import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd

def read_sheet_to_df(spreadsheet_id, sheet_name, creds_json_path):
    """
    Connects to a Google Sheets document and reads data into a pandas DataFrame.
    
    :param spreadsheet_id: The ID of the spreadsheet (found in its URL).
    :param sheet_name: The name of the sheet to read.
    :param creds_json_path: The path to the service account credentials JSON file.
    :return: A pandas DataFrame containing the sheet's data.
    """
    # Define the scope and authenticate using the service account
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(creds_json_path, scope)
    client = gspread.authorize(creds)
    
    # Open the spreadsheet and the specific sheet
    sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
    
    # Get all values in the sheet
    data = sheet.get_all_values()
    
    # Convert to DataFrame and set the first row as the header
    df = pd.DataFrame(data)
    df.columns = df.iloc[0] # Set first row as column names
    df = df[1:] # Remove the first row from data
    # save to .csv
    df.to_csv('df.csv', index=False)
    return df

# Example usage
SPREADSHEET_ID = '16sMhki17i1Glw7RWIXkWKHNKAetCE9HxHkHsUcDx4ts' # Update with your Spreadsheet ID
SHEET_NAME = 'Automation' # Update with the name of your sheet
CREDS_JSON_PATH = 'creds/sheets_auth.json' # Update with the path to your credentials file


if __name__ == '__main__':
    read_sheet_to_df(SPREADSHEET_ID, SHEET_NAME, CREDS_JSON_PATH)
    print('read_sheet_to_df.csv Done!')