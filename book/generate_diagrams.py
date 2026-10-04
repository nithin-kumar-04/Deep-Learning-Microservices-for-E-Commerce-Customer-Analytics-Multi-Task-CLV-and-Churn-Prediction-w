import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import os

plt.rcParams["font.family"] = "DejaVu Sans"

# ── 1. USE CASE DIAGRAM ───────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(12, 10))
ax.set_xlim(0, 12); ax.set_ylim(0, 10)
ax.axis("off"); ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6, 9.7, "Use Case Diagram — Zenthiqa Analytics System",
        ha="center", fontsize=14, fontweight="bold")
# System box
sys_box = FancyBboxPatch((2.5, 0.5), 9, 8.7, boxstyle="round,pad=0.1",
                          lw=2, edgecolor="black", facecolor="#f0f8ff")
ax.add_patch(sys_box)
ax.text(7.0, 9.1, "<<Zenthiqa Platform>>", ha="center", fontsize=9, style="italic")

def draw_actor(ax, x, y, label):
    ax.add_patch(plt.Circle((x, y+0.32), 0.18, color="black", fill=False, lw=2))
    ax.plot([x, x], [y+0.14, y-0.28], "k-", lw=2)
    ax.plot([x-0.28, x+0.28], [y+0.0, y+0.0], "k-", lw=2)
    ax.plot([x, x-0.22], [y-0.28, y-0.58], "k-", lw=2)
    ax.plot([x, x+0.22], [y-0.28, y-0.58], "k-", lw=2)
    ax.text(x, y-0.80, label, ha="center", va="top", fontsize=9, fontweight="bold")

draw_actor(ax, 1.2, 6.8, "Business\nManager")
draw_actor(ax, 1.2, 2.2, "System\nAdmin")

bm_cases = [
    (6.5, 8.3, "Search Customer by ID"),
    (6.5, 7.4, "View CLV & Churn Predictions"),
    (6.5, 6.5, "Run What-If Simulator"),
    (6.5, 5.6, "Trigger Batch Processing"),
    (6.5, 4.7, "View At-Risk Customers"),
    (6.5, 3.8, "Generate Win-Back Email"),
    (6.5, 2.9, "View Product Recommendations"),
]
admin_cases = [
    (6.5, 2.0, "Update Model Artifacts on S3"),
    (6.5, 1.2, "Monitor Application Logs"),
]
for (cx, cy, label) in bm_cases:
    ellipse = mpatches.Ellipse((cx, cy), 4.8, 0.65, edgecolor="black", facecolor="#e8f5e9", lw=1.5)
    ax.add_patch(ellipse)
    ax.text(cx, cy, label, ha="center", va="center", fontsize=9)
    ax.plot([1.5, cx-2.4], [6.8, cy], "k-", lw=0.8)

for (cx, cy, label) in admin_cases:
    ellipse = mpatches.Ellipse((cx, cy), 4.8, 0.65, edgecolor="black", facecolor="#fff3e0", lw=1.5)
    ax.add_patch(ellipse)
    ax.text(cx, cy, label, ha="center", va="center", fontsize=9)
    ax.plot([1.5, cx-2.4], [2.2, cy], "k-", lw=0.8)

plt.tight_layout()
plt.savefig("uml_use_case.jpg", dpi=300, bbox_inches="tight", facecolor="white")
plt.close()
print("use_case done")

# ── 2. CLASS DIAGRAM ──────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13, 9))
ax.set_xlim(0, 13); ax.set_ylim(0, 9)
ax.axis("off"); ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5, 8.75, "Class Diagram — Zenthiqa Backend Classes", ha="center", fontsize=14, fontweight="bold")

def draw_class_box(ax, x, y, w, name, attrs, methods, hc="#e3f2fd"):
    lh = 0.38
    ah = len(attrs)*lh + 0.25
    mh = len(methods)*lh + 0.25
    ax.add_patch(FancyBboxPatch((x,y-0.52),w,0.52,boxstyle="square,pad=0",ec="black",fc=hc,lw=2))
    ax.text(x+w/2,y-0.26,name,ha="center",va="center",fontsize=10,fontweight="bold")
    ax.add_patch(FancyBboxPatch((x,y-0.52-ah),w,ah,boxstyle="square,pad=0",ec="black",fc="white",lw=1.5))
    for i,a in enumerate(attrs): ax.text(x+0.15,y-0.68-i*lh,"+ "+a,va="center",fontsize=8.5)
    ax.add_patch(FancyBboxPatch((x,y-0.52-ah-mh),w,mh,boxstyle="square,pad=0",ec="black",fc="#fafafa",lw=1.5))
    for i,m in enumerate(methods): ax.text(x+0.15,y-0.52-ah-0.18-i*lh,"+ "+m,va="center",fontsize=8.5)
    return 0.52+ah+mh

draw_class_box(ax,0.2,8.5,6.0,"MTLModel",
    ["shared_encoder : Sequential","clv_head : Linear","churn_head : Sequential"],
    ["forward(x: Tensor): Tuple[CLV, Churn]"],"#e3f2fd")

draw_class_box(ax,6.8,8.5,6.0,"NCFModel",
    ["customer_embedding : Embedding","item_embedding : Embedding","mlp_layers : Sequential"],
    ["predict(cust_id: int, top_n: int): List"],"#e8f5e9")

draw_class_box(ax,0.2,4.0,6.0,"CustomerRecord",
    ["CustomerID : int","Recency : int","Frequency : int","Monetary : float","Segment : String"],
    ["to_tensor(): FloatTensor"],"#fff3e0")

draw_class_box(ax,6.8,4.0,6.0,"PredictionResponse",
    ["clv : float","churn_probability : float","churn_label : String","shap_values : dict","recommendations : List"],
    ["to_json(): dict"],"#fce4ec")

ax.annotate("",xy=(6.8,7.5),xytext=(6.2,7.5),arrowprops=dict(arrowstyle="->",lw=1.5,color="black"))
ax.text(6.5,7.65,"uses",ha="center",fontsize=8,style="italic")
ax.annotate("",xy=(3.2,4.0),xytext=(3.2,5.7),arrowprops=dict(arrowstyle="->",lw=1.2,color="#555",linestyle="dashed"))
ax.text(3.7,4.9,"produces",ha="center",fontsize=8,style="italic",color="#555")
ax.annotate("",xy=(9.8,4.0),xytext=(9.8,5.5),arrowprops=dict(arrowstyle="->",lw=1.2,color="#555",linestyle="dashed"))
ax.text(10.4,4.8,"produces",ha="center",fontsize=8,style="italic",color="#555")

plt.tight_layout()
plt.savefig("uml_class.jpg",dpi=300,bbox_inches="tight",facecolor="white")
plt.close()
print("class done")

# ── 3. SEQUENCE DIAGRAM ───────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13,11))
ax.set_xlim(0,13); ax.set_ylim(0,11)
ax.axis("off"); ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5,10.75,"Sequence Diagram — Customer Analysis Request Flow",ha="center",fontsize=13,fontweight="bold")

actors = [("User\n(Browser)",1.2,"#e3f2fd"),("Next.js\nFrontend",4.5,"#e8f5e9"),
          ("FastAPI\nBackend",8.0,"#fff3e0"),("PyTorch\nModels",11.5,"#fce4ec")]
for pos,actor,col in [(p,a,c) for (a,p,c) in actors]:
    ax.add_patch(FancyBboxPatch((pos-0.9,9.7),1.8,0.85,boxstyle="round,pad=0.05",ec="black",fc=col,lw=2))
    ax.text(pos,10.12,actor,ha="center",va="center",fontsize=9,fontweight="bold")
    ax.plot([pos,pos],[9.7,0.3],"k--",lw=0.8,alpha=0.5)
    ax.add_patch(FancyBboxPatch((pos-0.9,0.0),1.8,0.7,boxstyle="round,pad=0.05",ec="black",fc=col,lw=1.5))
    ax.text(pos,0.35,actor,ha="center",va="center",fontsize=8,fontweight="bold")

msgs = [
    (1.2,4.5,9.2,"1. Enter Customer ID 14911",False),
    (4.5,8.0,8.5,"2. HTTP GET /api/customer/14911",False),
    (8.0,8.0,7.8,"3. Query RFM DataFrame",True),
    (8.0,8.0,7.2,"4. Normalize → FloatTensor",True),
    (8.0,11.5,6.5,"5. MTLModel.forward(tensor)",False),
    (11.5,8.0,5.8,"6. Returns: CLV=4823.5, Churn=0.72",True),
    (8.0,8.0,5.1,"7. Compute SHAP Values",True),
    (8.0,11.5,4.4,"8. NCFModel.predict(cust_id, top_n=5)",False),
    (11.5,8.0,3.7,"9. Returns: [prod1, prod2, prod3, prod4, prod5]",True),
    (8.0,8.0,3.0,"10. Assemble JSON Response",True),
    (8.0,4.5,2.3,"11. HTTP 200 OK + JSON body",True),
    (4.5,1.2,1.6,"12. Render Dashboard Charts",True),
]
for (fx,tx,y,label,ret) in msgs:
    col = "#333" if ret else "black"
    ls = "dashed" if ret else "solid"
    if fx==tx:
        ax.annotate("",xy=(fx+0.7,y-0.25),xytext=(fx,y),
                    arrowprops=dict(arrowstyle="->",color=col,lw=1.5,connectionstyle="arc3,rad=-0.6"))
        ax.text(fx+0.85,y-0.12,label,va="center",fontsize=8,color=col)
    else:
        ax.annotate("",xy=(tx+(0.05 if tx<fx else -0.05),y),xytext=(fx+(0.05 if fx<tx else -0.05),y),
                    arrowprops=dict(arrowstyle="->",color=col,lw=1.5,linestyle=ls))
        ax.text((fx+tx)/2,y+0.1,label,ha="center",va="bottom",fontsize=8,color=col)

plt.tight_layout()
plt.savefig("uml_sequence.jpg",dpi=300,bbox_inches="tight",facecolor="white")
plt.close()
print("sequence done")

# ── 4. BLOCK DIAGRAM ──────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13,10))
ax.set_xlim(0,13); ax.set_ylim(0,10)
ax.axis("off"); ax.set_facecolor("white"); fig.patch.set_facecolor("white")
ax.text(6.5,9.75,"Block Diagram — Zenthiqa System Architecture",ha="center",fontsize=14,fontweight="bold")

layers=[
    {"y":8.0,"h":1.4,"fc":"#bbdefb","title":"LAYER 1: PRESENTATION","sub":"Next.js Frontend Dashboard",
     "boxes":["Overview Tab","Customer Insights Tab","Products Tab","Batch Processing Tab","At-Risk Customers Tab"]},
    {"y":5.7,"h":1.4,"fc":"#c8e6c9","title":"LAYER 2: API","sub":"FastAPI Backend  (AWS EC2)",
     "boxes":["REST API Endpoints","Pydantic Schema Validation","CORS Middleware Configuration"]},
    {"y":3.4,"h":1.4,"fc":"#ffe0b2","title":"LAYER 3: INTELLIGENCE","sub":"ML Inference Engine",
     "boxes":["MTL Model\n(CLV + Churn)","NCF Model\n(Recommendations)","K-Means\nSegmentation","SHAP\nExplainability"]},
    {"y":1.1,"h":1.4,"fc":"#e0e0e0","title":"LAYER 4: STORAGE","sub":"Amazon Web Services (AWS)",
     "boxes":["S3: Model Artifacts\n(.pth, .pkl files)","S3: Customer Data\n(Apache Parquet)","EC2: Runtime\nEnvironment"]},
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

for y in [8.0,5.7,3.4]:
    ax.annotate("",xy=(6.5,y-0.25),xytext=(6.5,y),arrowprops=dict(arrowstyle="<->",color="black",lw=2.5))

plt.tight_layout()
plt.savefig("uml_block.jpg",dpi=300,bbox_inches="tight",facecolor="white")
plt.close()
print("block done")
print("ALL diagrams generated.")
