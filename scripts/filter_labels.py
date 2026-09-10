import os
import yaml
import glob

dataset_yaml = r"data\raw\vision\dataset.yaml"
labels_dir = r"data\raw\vision\labels\val"

with open(dataset_yaml, "r") as f:
    data = yaml.safe_load(f)

# Find old IDs
box_id = None
person_ids = []

for k, v in data['names'].items():
    if v == "Box":
        box_id = k
    elif v in ["Person", "Man", "Woman", "Boy", "Girl"]:
        person_ids.append(k)

print(f"Old Box ID: {box_id}")
print(f"Old Person IDs: {person_ids}")

# Read all label files
label_files = glob.glob(os.path.join(labels_dir, "*.txt"))
filtered_count = 0

for file in label_files:
    with open(file, "r") as f:
        lines = f.readlines()
        
    new_lines = []
    for line in lines:
        parts = line.strip().split()
        if not parts: continue
        cls_id = int(parts[0])
        
        if cls_id == box_id:
            new_lines.append(f"0 {' '.join(parts[1:])}\n")
        elif cls_id in person_ids:
            new_lines.append(f"1 {' '.join(parts[1:])}\n")
            
    if new_lines:
        filtered_count += len(new_lines)
    
    with open(file, "w") as f:
        f.writelines(new_lines)

print(f"Filtered to {filtered_count} valid annotations.")

# Write new dataset.yaml
new_yaml = {
    "path": data["path"],
    "train": data.get("train", ".\images\\val\\"),
    "val": data.get("val", ".\images\\val\\"),
    "nc": 2,
    "names": {0: "Box", 1: "Person"}
}

with open(dataset_yaml, "w") as f:
    yaml.dump(new_yaml, f)

print("Rewrote dataset.yaml")
