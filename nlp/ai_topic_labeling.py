import pandas as pd

df = pd.read_csv(
    "trend_outputs/emerging_technologies.csv"
)

def clean_name(name):

    parts = name.split("_")[1:]

    return " ".join(parts).title()

df["technology_name"] = (
    df["Name"]
    .apply(clean_name)
)

print(
    df[
        ["technology_name","trend_score"]
    ].head(20)
)

def classify_domain(name):

    name = str(name).lower()

    if any(x in name for x in
        ["cyber","intrusion","security","botnet"]):
        return "Cybersecurity"

    elif any(x in name for x in
        ["radio","wireless","antenna","communication"]):
        return "Telecommunications"

    elif any(x in name for x in
        ["superconductor","graphene","alloy","material"]):
        return "Advanced Materials"

    elif any(x in name for x in
        ["radar","doppler"]):
        return "Defence Technologies"

    elif any(x in name for x in
        ["battery","supercapacitor"]):
        return "Energy Storage"

    else:
        return "Other"
    
    df["domain"] = (
    df["technology_name"]
    .apply(classify_domain)
)