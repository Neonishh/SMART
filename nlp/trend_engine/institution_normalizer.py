import pandas as pd

INSTITUTION_MAP = {

    # IISc
    "Indian Institute of Science": "Indian Institute of Science Bangalore",
    "Indian Institute of Science Bengaluru": "Indian Institute of Science Bangalore",
    "Indian Institute of Science, Bangalore": "Indian Institute of Science Bangalore",
    "IISc": "Indian Institute of Science Bangalore",
    "IISc Bangalore": "Indian Institute of Science Bangalore",

    # BMS
    "BMS College of Engineering": "B.M.S. College of Engineering",
    "B M S College of Engineering": "B.M.S. College of Engineering",
    "B.M.S College of Engineering": "B.M.S. College of Engineering",

    # CMR
    "CMR Institute Of Technology": "CMR Institute of Technology",

    # DSCE
    "Dayananda Sagar College Of Engineering": "Dayananda Sagar College of Engineering",

    # IIIT Bangalore
    "IIIT Bangalore": "International Institute of Information Technology Bangalore",
    "IIIT-B": "International Institute of Information Technology Bangalore",

    # PES
    "PES Institute of Technology": "PES University",
    "PESIT": "PES University",

    # RV
    "RV College of Engineering": "R V College of Engineering",
    "R.V. College of Engineering": "R V College of Engineering",

    # MS Ramaiah
    "M.S. Ramaiah Institute of Technology": "M S Ramaiah Institute of Technology",
    "M.S Ramaiah Institute of Technology": "M S Ramaiah Institute of Technology",
    "MS Ramaiah Institute of Technology": "M S Ramaiah Institute of Technology",
    "M S Ramiah Institute of Technology": "M S Ramaiah Institute of Technology",
    "M.S. Ramiah Institute of Technology": "M S Ramaiah Institute of Technology",

    # Merge MSRUAS into MSRIT
    "M S Ramaiah University of Applied Sciences": "M S Ramaiah Institute of Technology",
    "M.S. Ramaiah University of Applied Sciences": "M S Ramaiah Institute of Technology",
}


def normalize(series):
    return (
        series.astype(str)
        .str.strip()
        .str.replace(r"\s+", " ", regex=True)
        .replace(INSTITUTION_MAP)
    )