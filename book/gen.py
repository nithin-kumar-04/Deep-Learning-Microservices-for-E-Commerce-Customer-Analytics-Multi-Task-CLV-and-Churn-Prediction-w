import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

plt.rcParams["font.family"] = "DejaVu Sans"

def save(name): 
    plt.tight_layout()
    plt.savefig(name, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"Saved {name}")

# ── USE CASE ──────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(12,10))
ax.set_xlim(0,12); ax.set_ylim(0,10); ax.axis("off")
ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6,9.7,"Use Case Diagram — Zenthiqa Analytics System",ha="center",fontsize=14,fontweight="bold")
ax.add_patch(FancyBboxPatch((2.5,0.4),9.2,8.9,boxstyle="round,pad=0.1",lw=2,ec="black",fc="#f0f8ff"))
ax.text(7.0,9.1,"<<Zenthiqa Platform>>",ha="center",fontsize=9,style="italic")

def actor(ax,x,y,lbl):
    ax.add_patch(plt.Circle((x,y+0.32),0.18,color="black",fill=False,lw=2))
    ax.plot([x,x],[y+0.14,y-0.28],"k-",lw=2)
    ax.plot([x-0.28,x+0.28],[y+0.0,y+0.0],"k-",lw=2)
    ax.plot([x,x-0.22],[y-0.28,y-0.58],"k-",lw=2)
    ax.plot([x,x+0.22],[y-0.28,y-0.58],"k-",lw=2)
    ax.text(x,y-0.80,lbl,ha="center",va="top",fontsize=9,fontweight="bold")

actor(ax,1.2,6.8,"Business\nManager")
actor(ax,1.2,2.2,"System\nAdmin")

for i,(lbl,bc) in enumerate([
    ("Search Customer by ID","#e8f5e9"),
    ("View CLV & Churn Predictions","#e8f5e9"),
    ("Run What-If Simulator","#e8f5e9"),
    ("Trigger Batch Processing","#e8f5e9"),
    ("View At-Risk Customers","#e8f5e9"),
    ("Generate Win-Back Email","#e8f5e9"),
    ("View Product Recommendations","#e8f5e9"),
]):
    cy=8.3-i*0.85
    ax.add_patch(mpatches.Ellipse((6.5,cy),4.8,0.60,ec="black",fc=bc,lw=1.5))
    ax.text(6.5,cy,lbl,ha="center",va="center",fontsize=8.8)
    ax.plot([1.5,4.1],[6.8,cy],"k-",lw=0.9)

for i,(lbl,bc) in enumerate([
    ("Update Model Artifacts on S3","#fff3e0"),
    ("Monitor Application Logs","#fff3e0"),
]):
    cy=2.0-i*0.80
    ax.add_patch(mpatches.Ellipse((6.5,cy),4.8,0.60,ec="black",fc=bc,lw=1.5))
    ax.text(6.5,cy,lbl,ha="center",va="center",fontsize=8.8)
    ax.plot([1.5,4.1],[2.2,cy],"k-",lw=0.9)

save("uml_use_case.jpg")

# ── CLASS ─────────────────────────────────────────────────────────────────────
fig,ax = plt.subplots(figsize=(13,9))
ax.set_xlim(0,13); ax.set_ylim(0,9); ax.axis("off")
ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5,8.75,"Class Diagram — Zenthiqa Backend Classes",ha="center",fontsize=14,fontweight="bold")

def cls(ax,x,y,w,name,attrs,methods,fc):
    lh=0.38; ah=len(attrs)*lh+0.25; mh=len(methods)*lh+0.25
    ax.add_patch(FancyBboxPatch((x,y-0.52),w,0.52,boxstyle="square,pad=0",ec="black",fc=fc,lw=2))
    ax.text(x+w/2,y-0.26,name,ha="center",va="center",fontsize=10,fontweight="bold")
    ax.add_patch(FancyBboxPatch((x,y-0.52-ah),w,ah,boxstyle="square,pad=0",ec="black",fc="white",lw=1.5))
    for i,a in enumerate(attrs): ax.text(x+0.15,y-0.68-i*lh,"+ "+a,va="center",fontsize=8.5)
    ax.add_patch(FancyBboxPatch((x,y-0.52-ah-mh),w,mh,boxstyle="square,pad=0",ec="black",fc="#fafafa",lw=1.5))
    for i,m in enumerate(methods): ax.text(x+0.15,y-0.52-ah-0.18-i*lh,"+ "+m,va="center",fontsize=8.5)

cls(ax,0.2,8.5,6.0,"MTLModel",
    ["shared_encoder : Sequential","clv_head : Linear","churn_head : Sequential"],
    ["forward(x: Tensor): Tuple[CLV, Churn]"],"#e3f2fd")
cls(ax,6.8,8.5,6.0,"NCFModel",
    ["customer_embedding : Embedding","item_embedding : Embedding","mlp_layers : Sequential"],
    ["predict(cust_id: int, top_n: int): List"],"#e8f5e9")
cls(ax,0.2,4.0,6.0,"CustomerRecord",
    ["CustomerID : int","Recency : int","Frequency : int","Monetary : float","Segment : String"],
    ["to_tensor(): FloatTensor"],"#fff3e0")
cls(ax,6.8,4.0,6.0,"PredictionResponse",
    ["clv : float","churn_probability : float","churn_label : String","shap_values : dict","recommendations : List"],
    ["to_json(): dict"],"#fce4ec")

ax.annotate("",xy=(6.8,7.5),xytext=(6.2,7.5),arrowprops=dict(arrowstyle="->",lw=1.5))
ax.text(6.5,7.65,"uses",ha="center",fontsize=8,style="italic")
ax.annotate("",xy=(3.2,4.0),xytext=(3.2,5.72),arrowprops=dict(arrowstyle="->",lw=1.2,color="#555"))
ax.text(3.7,4.85,"produces",ha="center",fontsize=8,style="italic",color="#555")
ax.annotate("",xy=(9.8,4.0),xytext=(9.8,5.55),arrowprops=dict(arrowstyle="->",lw=1.2,color="#555"))
ax.text(10.4,4.75,"produces",ha="center",fontsize=8,style="italic",color="#555")

save("uml_class.jpg")

# ── SEQUENCE ──────────────────────────────────────────────────────────────────
fig,ax = plt.subplots(figsize=(13,11))
ax.set_xlim(0,13); ax.set_ylim(0,11); ax.axis("off")
ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5,10.75,"Sequence Diagram — Customer Analysis Request Flow",ha="center",fontsize=13,fontweight="bold")

actrs=[("User\n(Browser)",1.2,"#e3f2fd"),("Next.js\nFrontend",4.5,"#e8f5e9"),
       ("FastAPI\nBackend",8.0,"#fff3e0"),("PyTorch\nModels",11.5,"#fce4ec")]
for(lbl,pos,fc) in actrs:
    ax.add_patch(FancyBboxPatch((pos-0.9,9.7),1.8,0.85,boxstyle="round,pad=0.05",ec="black",fc=fc,lw=2))
    ax.text(pos,10.12,lbl,ha="center",va="center",fontsize=9,fontweight="bold")
    ax.plot([pos,pos],[9.7,0.3],"k--",lw=0.8,alpha=0.5)
    ax.add_patch(FancyBboxPatch((pos-0.9,0.0),1.8,0.68,boxstyle="round,pad=0.05",ec="black",fc=fc,lw=1.5))
    ax.text(pos,0.34,lbl,ha="center",va="center",fontsize=8,fontweight="bold")

msgs=[
    (1.2,4.5,9.2,"1. Enter Customer ID 14911",False),
    (4.5,8.0,8.5,"2. HTTP GET /api/customer/14911",False),
    (8.0,8.0,7.8,"3. Query RFM DataFrame (in-memory)",True),
    (8.0,8.0,7.2,"4. Normalize Features → FloatTensor",True),
    (8.0,11.5,6.5,"5. MTLModel.forward(tensor)",False),
    (11.5,8.0,5.8,"6. Returns: CLV=4823.5, Churn=0.72",True),
    (8.0,8.0,5.1,"7. Compute Exact SHAP Values",True),
    (8.0,11.5,4.4,"8. NCFModel.predict(cust_id, top_n=5)",False),
    (11.5,8.0,3.7,"9. Returns: top-5 product IDs",True),
    (8.0,8.0,3.0,"10. Assemble JSON PredictionResponse",True),
    (8.0,4.5,2.3,"11. HTTP 200 OK + JSON Body",True),
    (4.5,1.2,1.6,"12. Render Dashboard Charts",True),
]
for(fx,tx,y,lbl,ret) in msgs:
    col="#444" if ret else "black"
    ls="dashed" if ret else "solid"
    if fx==tx:
        ax.annotate("",xy=(fx+0.7,y-0.25),xytext=(fx,y),
                    arrowprops=dict(arrowstyle="->",color=col,lw=1.5,connectionstyle="arc3,rad=-0.6"))
        ax.text(fx+0.85,y-0.12,lbl,va="center",fontsize=8,color=col)
    else:
        x0=fx+(0.9 if tx>fx else -0.9); x1=tx+(-0.9 if tx>fx else 0.9)
        ax.annotate("",xy=(x1,y),xytext=(x0,y),
                    arrowprops=dict(arrowstyle="->",color=col,lw=1.5,linestyle=ls))
        ax.text((fx+tx)/2,y+0.1,lbl,ha="center",va="bottom",fontsize=8,color=col)

save("uml_sequence.jpg")

# ── BLOCK ─────────────────────────────────────────────────────────────────────
fig,ax = plt.subplots(figsize=(13,10))
ax.set_xlim(0,13); ax.set_ylim(0,10); ax.axis("off")
ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5,9.75,"Block Diagram — Zenthiqa System Architecture",ha="center",fontsize=14,fontweight="bold")

layers=[
    {"y":8.0,"h":1.4,"fc":"#bbdefb","title":"LAYER 1: PRESENTATION LAYER","sub":"Next.js Frontend Dashboard",
     "boxes":["Overview\nTab","Customer Insights\nTab","Products\nTab","Batch Processing\nTab","At-Risk\nCustomers Tab"]},
    {"y":5.7,"h":1.4,"fc":"#c8e6c9","title":"LAYER 2: API LAYER","sub":"FastAPI Backend  (Deployed on AWS EC2)",
     "boxes":["REST API\nEndpoints","Pydantic Schema\nValidation","CORS\nMiddleware"]},
    {"y":3.4,"h":1.4,"fc":"#ffe0b2","title":"LAYER 3: INTELLIGENCE LAYER","sub":"ML Inference Engine",
     "boxes":["MTL Model\n(CLV + Churn)","NCF Model\n(Recommendations)","K-Means\nSegmentation","SHAP\nExplainability"]},
    {"y":1.1,"h":1.4,"fc":"#e0e0e0","title":"LAYER 4: STORAGE LAYER","sub":"Amazon Web Services (AWS Cloud)",
     "boxes":["S3: Model Artifacts\n(.pth / .pkl)","S3: Customer Data\n(Apache Parquet)","EC2: Python\nRuntime"]},
]
for layer in layers:
    y,h=layer["y"],layer["h"]
    ax.add_patch(FancyBboxPatch((0.3,y),12.4,h+0.55,boxstyle="round,pad=0.05",ec="black",fc=layer["fc"],lw=2))
    ax.text(0.6,y+h+0.38,layer["title"],va="center",fontsize=10,fontweight="bold")
    ax.text(0.6,y+h+0.1,layer["sub"],va="center",fontsize=8.5,style="italic")
    boxes=layer["boxes"]; n=len(boxes); bw=10.8/n
    for i,bl in enumerate(boxes):
        bx=1.0+i*bw
        ax.add_patch(FancyBboxPatch((bx+0.08,y+0.12),bw-0.2,h+0.1,boxstyle="round,pad=0.05",ec="black",fc="white",lw=1.2))
        ax.text(bx+bw/2,y+0.62,bl,ha="center",va="center",fontsize=8.5)

for yt in [8.0,5.7,3.4]:
    ax.annotate("",xy=(6.5,yt-0.22),xytext=(6.5,yt),
                arrowprops=dict(arrowstyle="<->",color="black",lw=2.5))

save("uml_block.jpg")
print("ALL DONE")
