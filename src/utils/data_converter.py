import csv
import json

def csv_to_json(file_path):
  """
  Reads a CSV file, converts the data to a JSON object.

  Args:
    file_path: The path to the CSV file.

  Returns:
    A JSON object representing the data in the CSV file.
  """
  data = []
  with open(file_path, 'r') as csvfile:
    csv_reader = csv.DictReader(csvfile)
    for row in csv_reader:
      data.append(row)
  return json.dumps(data)

  # name,age,city
  # Alice,30,New York
  # Bob,25,London
  
  # Create a dummy CSV file for demonstration
  dummy_csv_content = "name,age,city\nAlice,30,New York\nBob,25,London"
  with open("data.csv", "w") as f:
      f.write(dummy_csv_content)
