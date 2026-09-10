"""
Exploratory Data Analysis (EDA) & Publication Visualization Engine
Academic Project: Autonomous Warehouse AI - Predictive Analytics
Generates publication-quality figures saved to predictive_analytics/results/figures/:
  1. target_distribution.png
  2. inventory_vs_forecast_demand.png
  3. lead_time_vs_demand_by_risk.png
  4. days_of_supply_distribution.png
  5. correlation_matrix.png
  6. risk_by_category_and_zone.png
  7. feature_boxplots.png
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from data_loader import get_prepared_dataframe

FIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results", "figures")
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

def generate_all_eda_plots():
    os.makedirs(FIG_DIR, exist_ok=True)
    df = get_prepared_dataframe()
    
    # Feature addition for EDA plotting
    df["days_of_supply"] = df["stock_level"] / (df["daily_demand"] + 1e-5)
    
    # 1. Target Distribution
    fig, ax = plt.subplots(figsize=(7, 5))
    counts = df["stock_risk"].value_counts()
    labels = ["LOW RISK (0)", "HIGH RISK (1)"]
    colors = ["#2a9d8f", "#e76f51"]
    bars = ax.bar(labels, [counts[0], counts[1]], color=colors, edgecolor="black", width=0.55)
    for bar in bars:
        h = bar.get_height()
        pct = (h / len(df)) * 100
        ax.text(bar.get_x() + bar.get_width()/2., h + 30, f"{h} ({pct:.1f}%)", ha="center", va="bottom", fontsize=11, fontweight="bold")
    ax.set_ylabel("Item Count", fontsize=12, fontweight="bold")
    ax.set_title("Warehouse Inventory Stock-Risk Target Distribution", fontsize=13, fontweight="bold")
    ax.set_ylim(0, counts[0] + 350)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "target_distribution.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 2. Inventory vs Forecast Demand with Decision Boundary
    fig, ax = plt.subplots(figsize=(8, 6))
    scatter = ax.scatter(
        df["forecasted_demand_next_7d"], df["stock_level"],
        c=df["stock_risk"], cmap=matplotlib.colors.ListedColormap(["#2a9d8f", "#e76f51"]),
        alpha=0.65, edgecolors="none", s=25
    )
    # y = x line
    max_val = min(df["stock_level"].max(), df["forecasted_demand_next_7d"].max())
    ax.plot([0, max_val], [0, max_val], "k--", linewidth=2, label="Parity Boundary: Stock = 7d Demand")
    ax.fill_between([0, max_val], [0, 0], [0, max_val], color="#e76f51", alpha=0.15, label="High Stockout Risk Region")
    ax.set_xlabel("Forecasted 7-Day Customer Demand (Units)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Current Stock Level on Hand (Units)", fontsize=11, fontweight="bold")
    ax.set_title("Operational Stockout Boundary: Stock on Hand vs. Horizon Demand", fontsize=13, fontweight="bold")
    ax.legend(loc="upper left", frameon=True)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "inventory_vs_forecast_demand.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 3. Lead Time vs Daily Demand by Risk
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.scatterplot(
        data=df, x="lead_time_days", y="daily_demand", hue="stock_risk",
        palette={0: "#2a9d8f", 1: "#e76f51"}, alpha=0.7, ax=ax, s=35
    )
    ax.set_xlabel("Supplier Replenishment Lead Time (Days)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Average Daily Demand (Units/Day)", fontsize=11, fontweight="bold")
    ax.set_title("Lead Time vs. Daily Demand Interaction by Stock Risk Class", fontsize=13, fontweight="bold")
    handles, _ = ax.get_legend_handles_labels()
    ax.legend(handles=handles, labels=["Low Risk", "High Risk"], title="Inventory Risk", loc="upper right")
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "lead_time_vs_demand_by_risk.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 4. Days of Supply Distribution (Histogram / KDE)
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.kdeplot(df[df["stock_risk"] == 0]["days_of_supply"].clip(upper=60), ax=ax, color="#2a9d8f", fill=True, label="Low Risk", alpha=0.4, linewidth=2)
    sns.kdeplot(df[df["stock_risk"] == 1]["days_of_supply"].clip(upper=60), ax=ax, color="#e76f51", fill=True, label="High Risk", alpha=0.4, linewidth=2)
    ax.set_xlabel("Estimated Days of Supply Remaining (Capped at 60 Days)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Density", fontsize=11, fontweight="bold")
    ax.set_title("Kernel Density Estimation of Days of Supply by Risk Class", fontsize=13, fontweight="bold")
    ax.legend(frameon=True)
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "days_of_supply_distribution.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 5. Full Correlation Matrix Heatmap
    fig, ax = plt.subplots(figsize=(12, 10))
    numeric_df = df.select_dtypes(include=[np.number]).drop(columns=["forecasted_demand_next_7d"], errors="ignore")
    corr = numeric_df.corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(corr, mask=mask, cmap="vlag", center=0, annot=True, fmt=".2f", ax=ax, cbar_kws={"shrink": 0.8}, annot_kws={"size": 7})
    ax.set_title("Feature Correlation Matrix (Excluding Future Horizon Demand)", fontsize=14, fontweight="bold")
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "correlation_matrix.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 6. Risk by Category and Warehouse Zone
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    
    cat_risk = df.groupby("category")["stock_risk"].mean() * 100
    bars1 = ax1.bar(cat_risk.index, cat_risk.values, color="#457b9d", edgecolor="black", width=0.55)
    ax1.set_ylabel("High Risk Proportion (%)", fontsize=11, fontweight="bold")
    ax1.set_title("Stockout Risk Rate by Product Category", fontsize=12, fontweight="bold")
    ax1.set_ylim(0, max(cat_risk.values) + 10)
    for bar in bars1:
        h = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., h + 0.8, f"{h:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")
        
    zone_risk = df.groupby("zone")["stock_risk"].mean() * 100
    bars2 = ax2.bar(zone_risk.index, zone_risk.values, color="#e9c46a", edgecolor="black", width=0.55)
    ax2.set_ylabel("High Risk Proportion (%)", fontsize=11, fontweight="bold")
    ax2.set_title("Stockout Risk Rate by Warehouse Zone", fontsize=12, fontweight="bold")
    ax2.set_ylim(0, max(zone_risk.values) + 10)
    for bar in bars2:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., h + 0.8, f"{h:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")
        
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "risk_by_category_and_zone.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")
    
    # 7. Feature Comparison Boxplots
    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    features_to_plot = [
        ("stock_level", "Current Stock Level (Units)"),
        ("daily_demand", "Daily Customer Demand (Units)"),
        ("order_fulfillment_rate", "Historical Fulfillment Rate"),
        ("turnover_ratio", "Inventory Turnover Ratio")
    ]
    for idx, (col, title) in enumerate(features_to_plot):
        ax = axes[idx // 2, idx % 2]
        sns.boxplot(data=df, x="stock_risk", y=col, ax=ax, hue="stock_risk", palette={0: "#2a9d8f", 1: "#e76f51"}, legend=False, width=0.45)
        ax.set_xticklabels(["LOW RISK (0)", "HIGH RISK (1)"], fontweight="bold")
        ax.set_xlabel("Target Class", fontweight="bold")
        ax.set_ylabel(title, fontweight="bold")
        ax.set_title(f"Distribution of {col} by Risk Class", fontweight="bold")
        
    plt.tight_layout()
    fig_path = os.path.join(FIG_DIR, "feature_boxplots.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[EDA] Saved: {fig_path}")

if __name__ == "__main__":
    generate_all_eda_plots()

