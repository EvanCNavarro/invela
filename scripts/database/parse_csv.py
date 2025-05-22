import csv

groups = {}

with open('attached_assets/S&P_KY3P_Security_Assessment_4Groups_Final.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        group = row['group']
        if group in groups:
            groups[group] += 1
        else:
            groups[group] = 1

print('Groups found:')
for group, count in sorted(groups.items()):
    print(f'- {group}: {count} fields')