import streamlit as st
import pandas as pd
import requests
import os
import io

# Setup API URL
API_URL = os.environ.get("API_URL", "http://localhost:8000")

st.set_page_config(page_title="E-Commerce Deep Learning Insights", layout="wide")

@st.cache_data
def load_base_data():
    try:
        # Load the base parquet for historical baseline lookup
        df = pd.read_parquet("data/dl_clv_predictions.parquet").set_index('CustomerID')
        return df
    except FileNotFoundError:
        return None

clv_df = load_base_data()

st.title("🛍️ E-Commerce Deep Learning Insights & Recommendations")
st.markdown("*Powered by PyTorch Microservices*")

if clv_df is None:
    st.warning("Data not found. Please run the Deep Learning pipeline scripts first.")
else:
    # --- SIDEBAR ---
    st.sidebar.header("Customer Search & Simulation")
    
    # 1. Quick-Pick
    def get_sample_profiles(df):
        high_value = df.sort_values(by=['DL_Predicted_CLV_90d', 'DL_Churn_Probability'], ascending=[False, True]).index[0]
        at_risk_vip = df.sort_values(by=['DL_Predicted_CLV_90d', 'DL_Churn_Probability'], ascending=[False, False]).index[0]
        return {
            "Custom ID": None,
            f"High Value / Low Churn (ID: {high_value})": int(high_value),
            f"At-Risk VIP (ID: {at_risk_vip})": int(at_risk_vip)
        }
    
    profiles = get_sample_profiles(clv_df)
    selected_profile = st.sidebar.selectbox("Quick-Pick Sample Customers:", options=list(profiles.keys()))
    
    if profiles[selected_profile] is not None:
        customer_id = profiles[selected_profile]
        st.sidebar.info(f"Viewing auto-selected CustomerID: {customer_id}")
        st.sidebar.number_input("Enter CustomerID Manually", value=int(customer_id), disabled=True, help="Change to 'Custom ID' to edit.")
    else:
        customer_id = st.sidebar.number_input("Enter CustomerID Manually", min_value=10000, max_value=30000, step=1, value=int(clv_df.index[0]))
    
    if customer_id in clv_df.index:
        cust_info = clv_df.loc[customer_id]
        
        # 2. What-If Simulator
        st.sidebar.divider()
        st.sidebar.subheader("🎛️ 'What-If' Simulator")
        st.sidebar.markdown("Modify historical behavior to simulate real-time PyTorch predictions via FastAPI.")
        
        sim_recency = st.sidebar.slider("Days Since Last Order", 0, 365, int(cust_info.get('Recency_Days', 0)))
        sim_freq = st.sidebar.slider("Total Orders", 1, 50, int(cust_info.get('Historical_Orders', 1)))
        sim_monetary = st.sidebar.number_input("Total Historical Spend ($)", value=float(cust_info.get('Historical_Spend', 100.0)))
        
        # Call API for Prediction
        try:
            res = requests.post(f"{API_URL}/predict/clv", json={
                "recency": sim_recency,
                "frequency": sim_freq,
                "monetary": sim_monetary
            })
            res.raise_for_status()
            api_pred = res.json()
            clv_90d = api_pred['predicted_clv_90d']
            churn_prob = api_pred['churn_probability']
        except Exception as e:
            st.error(f"API Error: Make sure FastAPI is running (`uvicorn api:app`). Falling back to static data. {e}")
            clv_90d = cust_info.get('DL_Predicted_CLV_90d', 0)
            churn_prob = cust_info.get('DL_Churn_Probability', 0)
            
        segment = cust_info.get('Segment_Badge', 'Unknown')
        
        # --- MAIN BODY ---
        st.markdown(f"#### Customer ID: {customer_id} &nbsp;|&nbsp; Base Segment: `{segment}`")
        st.divider()
        
        st.markdown("### Historical Baseline")
        h1, h2, h3 = st.columns(3)
        h1.metric("Total Historical Spend", f"${sim_monetary:,.2f}")
        h2.metric("Total Orders / Frequency", f"{sim_freq} Orders")
        h3.metric("Recency / Last Active", f"{sim_recency} Days Ago")
        
        st.markdown("### Deep Learning Predictions (Real-Time)")
        p1, p2, p3 = st.columns(3)
        
        p1.metric("Predicted 90-Day CLV", f"${clv_90d:,.2f}")
        
        churn_risk_level = "High" if churn_prob > 0.5 else ("Medium" if churn_prob > 0.2 else "Low")
        p2.metric("Churn Risk", f"{churn_prob*100:.1f}% ({churn_risk_level})")
        
        p3.metric("Proj. Monthly Value", f"${clv_90d / 3:,.2f}")
        
        # Explainable AI (XAI)
        with st.expander("🔍 Why this prediction? (Explainable AI)"):
            st.write("Deep Learning Feature Attribution Heuristics:")
            if sim_recency > 90:
                st.write(f"- 🔴 **High Recency ({sim_recency} days)** significantly increases Churn Risk.")
            else:
                st.write(f"- 🟢 **Low Recency ({sim_recency} days)** keeps Churn Risk low.")
                
            if sim_freq == 1:
                st.write(f"- 🔴 **Single Order History** makes it difficult to project high future CLV.")
            else:
                st.write(f"- 🟢 **High Frequency ({sim_freq} orders)** strongly boosts projected CLV.")
                
        st.divider()
        
        # Action Logic
        if churn_risk_level == "High" and clv_90d > 100:
            st.warning("⚠️ **Suggested CRM Action:** **High churn risk** detected for a **high-value account**. Trigger an automated win-back campaign with a **15% discount** on top affinity items.")
        elif churn_risk_level == "High":
            st.error("📉 **Suggested CRM Action:** Account is **highly likely to churn** but has **moderate/low projected value**. Send standard re-engagement email without discounting to preserve margins.")
        elif churn_risk_level == "Low" and segment == "Champion":
            st.success("⭐ **Suggested CRM Action:** **Loyal Champion** account. Enter into **VIP Loyalty Flow**. **Do NOT offer discounts.**")
        else:
            st.info("💡 **Suggested CRM Action:** **Standard lifecycle marketing**. Continue regular cadence of personalized newsletters.")
            
        st.divider()
        
        # Recommendations (API Call)
        st.subheader("📦 Top 5 Personalized Recommendations (NCF Deep Learning)")
        try:
            rec_res = requests.get(f"{API_URL}/recommend/{customer_id}")
            rec_res.raise_for_status()
            recs = rec_res.json()['recommendations']
            rec_df = pd.DataFrame(recs)
            
            if not rec_df.empty:
                # Convert affinity to float for progress column (0-100)
                rec_df['Match Score'] = rec_df['affinity_score'] * 100.0
                
                st.dataframe(
                    rec_df[['rank', 'stock_code', 'description', 'Match Score']].rename(columns={'rank':'Rank', 'stock_code':'StockCode', 'description':'Description'}),
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "Match Score": st.column_config.ProgressColumn(
                            "Affinity Match",
                            help="NCF probability score",
                            format="%.1f%%",
                            min_value=0.0,
                            max_value=100.0,
                        )
                    }
                )
            else:
                st.info("No recommendations generated for this user.")
        except Exception as e:
            st.error(f"API Error fetching recommendations: {e}")
            
    else:
        st.error(f"CustomerID {customer_id} not found in the dataset.")

# Batch Processing
st.divider()
st.header("🗃️ Batch Customer Scoring")
st.write("Upload a CSV with `CustomerID`, `Recency`, `Frequency`, `Monetary` to score multiple users instantly.")
uploaded_file = st.file_uploader("Upload CSV", type=["csv"])
if uploaded_file is not None:
    try:
        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "text/csv")}
        batch_res = requests.post(f"{API_URL}/batch_predict", files=files)
        batch_res.raise_for_status()
        
        st.success("Batch scoring complete!")
        st.download_button(
            label="⬇️ Download Scored CSV",
            data=batch_res.json()["csv_data"],
            file_name="dl_scored_customers.csv",
            mime="text/csv"
        )
    except Exception as e:
        st.error(f"Batch processing failed: {e}")
