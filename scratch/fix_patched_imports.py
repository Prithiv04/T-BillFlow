import os
import re

def process_directory(base_dir):
    harnesses_dir = os.path.join(base_dir, "fv", "harnesses")
    contracts_dir = os.path.join(base_dir, "contracts")
    
    if not os.path.exists(harnesses_dir):
        print(f"Directory not found: {harnesses_dir}")
        return 0, []

    patched_regex = re.compile(r'("../patched/([^"]+)")|(\'../patched/([^\']+)\')')
    
    changed_count = 0
    unreplaced = []

    for fname in os.listdir(harnesses_dir):
        if not fname.endswith(".sol"):
            continue
        filepath = os.path.join(harnesses_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        matches = list(patched_regex.finditer(content))
        if not matches:
            continue

        new_content = content
        file_changed = False
        for match in matches:
            full_match = match.group(0)
            rel_path = match.group(2) or match.group(4)
            target_oz_file = os.path.join(contracts_dir, rel_path.replace("/", os.sep))
            
            if os.path.exists(target_oz_file):
                replacement = f'"@openzeppelin/contracts/{rel_path}"'
                new_content = new_content.replace(full_match, replacement)
                changed_count += 1
                file_changed = True
                print(f"[{fname}] Replaced {full_match} -> {replacement}")
            else:
                unreplaced.append((fname, full_match, target_oz_file))
                print(f"[{fname}] ERROR: File not found in contracts/: {target_oz_file}")

        if file_changed:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)

    return changed_count, unreplaced

if __name__ == "__main__":
    dirs_to_check = [
        r"c:\Users\shaki\OneDrive\Desktop\T-billflow\lib\openzeppelin-contracts",
        r"c:\Users\shaki\OneDrive\Desktop\T-billflow\contracts\lib\openzeppelin-contracts"
    ]
    total_changed = 0
    all_unreplaced = []
    for d in dirs_to_check:
        print(f"\nProcessing: {d}")
        cnt, unrep = process_directory(d)
        total_changed += cnt
        all_unreplaced.extend(unrep)

    print(f"\nSummary:")
    print(f"Total imports changed: {total_changed}")
    print(f"Unreplaced count: {len(all_unreplaced)}")
    for item in all_unreplaced:
        print(f" - Could not replace: {item}")
