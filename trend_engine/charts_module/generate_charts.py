import os
import pandas as pd
import matplotlib.pyplot as plt

# ==========================================
# SETTINGS
# ==========================================

DOMAIN = "Artificial Intelligence and Computer Vision"

OUTPUT_DIR = "charts_module/charts/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ==========================================
# LOAD DATA
# ==========================================

df = pd.read_csv(
    "outputs/domain_yearly_counts.csv"
)
# Filter one technology
df = df[df["domain_name"] == DOMAIN].copy()

df = df.sort_values("year")

# ==========================================
# PLOT
# ==========================================

plt.figure(figsize=(10,6))

plt.plot(
    df["year"],
    df["publications"],
    marker="o",
    linewidth=2,
    label="Publications"
)

plt.plot(
    df["year"],
    df["patents"],
    marker="s",
    linewidth=2,
    label="Patents"
)

plt.plot(
    df["year"],
    df["grants"],
    marker="^",
    linewidth=2,
    label="Grants"
)

plt.plot(
    df["year"],
    df["theses"],
    marker="D",
    linewidth=2,
    label="Theses"
)

plt.title(
    f"{DOMAIN}\nResearch Output Trend (2019–2025)",
    fontsize=15,
    weight="bold"
)

plt.xlabel("Year")
plt.ylabel("Research Output")

plt.grid(alpha=0.3)

plt.legend()

plt.tight_layout()

filename = os.path.join(
    OUTPUT_DIR,
    "domain_trend.png"
)

plt.savefig(filename, dpi=300)

plt.close()

print("Chart saved to:")
print(filename)