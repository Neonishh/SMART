import os
import pandas as pd
import matplotlib.pyplot as plt

OUTPUT_FOLDER = "trend_engine/charts/images"

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)

counts = pd.read_csv(
    "trend_engine/outputs/domain_yearly_counts.csv"
)


def research_output_trend(domain):

    df = counts[
        counts["domain_name"] == domain
    ].copy()

    df = df.sort_values("year")

    plt.figure(figsize=(10, 6))

    plt.plot(
        df["year"],
        df["publications"],
        marker="o",
        label="Publications"
    )

    plt.plot(
        df["year"],
        df["patents"],
        marker="s",
        label="Patents"
    )

    plt.plot(
        df["year"],
        df["grants"],
        marker="^",
        label="Grants"
    )

    plt.plot(
        df["year"],
        df["theses"],
        marker="D",
        label="Theses"
    )

    plt.title(
        f"{domain} Research Output Trend"
    )

    plt.xlabel("Year")

    plt.ylabel("Research Output")

    plt.grid(True)

    plt.legend()

    filename = (
        domain.lower()
        .replace(" ", "_")
        + "_trend.png"
    )

    filepath = os.path.join(
        OUTPUT_FOLDER,
        filename
    )

    plt.savefig(
        filepath,
        dpi=300,
        bbox_inches="tight"
    )

    plt.close()

    print(
        "Saved:",
        filepath
    )


if __name__ == "__main__":

    research_output_trend(
        "Artificial Intelligence and Computer Vision"
    )