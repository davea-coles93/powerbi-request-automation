import json

# Load existing seed data
with open('seed_data.json', 'r') as f:
    seed_data = json.load(f)

# Load semantic tables
with open('semantic_tables_seed.json', 'r') as f:
    semantic_data = json.load(f)

# Add semantic_tables to seed data
seed_data['semantic_tables'] = semantic_data['semantic_tables']

# Save updated seed data
with open('seed_data.json', 'w') as f:
    json.dump(seed_data, f, indent=2)

print("✓ Semantic tables added to seed_data.json")
print(f"  - Added {len(semantic_data['semantic_tables'])} semantic tables")
print(f"  - Total DAX measures: {sum(len(t['measures']) for t in semantic_data['semantic_tables'])}")
