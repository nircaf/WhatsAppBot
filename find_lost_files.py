def find_lost_files(search_string):
    import os
    
    directory = r'C:\Nir\Misc\whatsapp-bot\.git\lost-found\other'
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if search_string in content:
                    print(f'Found {search_string} in {file_path}')

if __name__ == '__main__':
    find_lost_files('"name": "whatsapp-bot"')