import re

def normalize_venue(venue):

    if venue is None:
        return ""

    venue = str(venue).strip()

    if venue == "":
        return ""

    # remove multiple spaces
    venue = re.sub(r"\s+", " ", venue)

    # remove trailing commas/full stops
    venue = venue.rstrip(".,;:")

    # title case
    venue = venue.title()

    return venue