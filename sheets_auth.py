# // read creds/sheets_auth.json
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

def update_sheet_from_df(spreadsheet_id, sheet_name, df, creds_json_path):
    """
    Updates a Google Sheets document with data from a pandas DataFrame.

    :param spreadsheet_id: The ID of the spreadsheet (found in its URL).
    :param sheet_name: The name of the sheet to update.
    :param df: The pandas DataFrame containing the data to update.
    :param creds_json_path: The path to the service account credentials JSON file.
    """
    # Define the scope and authenticate using the service account
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(creds_json_path, scope)
    client = gspread.authorize(creds)
    
    # Open the spreadsheet and the specific sheet
    sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
    
    # Prepare DataFrame data for update (including headers)
    values = [df.columns.values.tolist()] + df.values.tolist()
    
    # Update the sheet with DataFrame data
    sheet.update(range_name= 'A1', values= values)
    print(f'Sheet updated successfully!. Values: {values}' )

# Example usage
SPREADSHEET_ID = '16sMhki17i1Glw7RWIXkWKHNKAetCE9HxHkHsUcDx4ts' # Update with your Spreadsheet ID
SHEET_NAME = 'Automation' # Update with the name of your sheet
CREDS_JSON_PATH = 'creds/sheets_auth.json' # Update with the path to your credentials file


import sys
import json
import pandas as pd
import re

if __name__ == "__main__":
    # hasResponded attending numGuests askedRide needsRide TimeSent
    data = {'Phone': '0537711945@asdf','hasResponded': True,'attending': False,'numGuests': 0,'askedRide': False,'needsRide': False,'TimeSent': '2022-09-29 14:01:04'}
    # Read JSON string from stdin
    json_str = sys.stdin.read()
    # Convert JSON string to Python object
    data = json.loads(json_str)
    print(f'data {data}')
    # remove non numeric values from Phone
    data['Phone'] = re.sub(r'\D', '', data['Phone'])
    # replace start with 0 with 972 re.sub('^0', '972', data['Phone'])
    data['Phone'] = re.sub('^0', '972', data['Phone'])
    #  starts with 5 and len = 10
    if len(data['Phone']) == 10 and data['Phone'][0] == '5':
        data['Phone'] = '972' + data['Phone']
    df_orig = read_sheet_to_df(SPREADSHEET_ID, SHEET_NAME, CREDS_JSON_PATH)
    # remove non numeric values
    df_orig['Phone'] = df_orig['Phone'].astype(str).str.replace(r'\D', '', regex=True)
    for key in df_orig.columns:
        if key == 'Name':
            continue
        df_orig.loc[df_orig['Phone'] == data['Phone'], key] = data[key]
    print(f'df merged {df_orig}')
    update_sheet_from_df(SPREADSHEET_ID, SHEET_NAME, df_orig, CREDS_JSON_PATH)

