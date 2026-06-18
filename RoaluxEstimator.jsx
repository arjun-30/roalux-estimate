import { useState, useCallback, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const T = {
    navy: "#18181B",
    slate: "#27272A",
    slateL: "#3F3F46",
    amber: "#2563EB",
    amberDim: "#1D4ED8",
    sky: "#38BDF8",
    bg: "#F3F4F6",
    card: "#FFFFFF",
    text: "#18181B",
    muted: "#6B7280",
    border: "#E5E7EB",
    green: "#10B981",
    red: "#EF4444",
    purple: "#3B82F6",
};

// ─── SEED DATA ──────────────────────────────────────────────────────────────
const INIT_SUPPLIERS = [
    { id: "s1", name: "Sigma-Aldrich", code: "SA", country: "Germany", email: "orders@sigma.com", color: "#3B82F6" },
    { id: "s2", name: "BASF India", code: "BI", country: "India", email: "india@basf.com", color: "#3B82F6" },
    { id: "s3", name: "Brenntag", code: "BR", country: "Netherlands", email: "info@brenntag.nl", color: "#10B981" },
    { id: "s4", name: "Univar Solutions", code: "UV", country: "USA", email: "sales@univar.com", color: "#2563EB" },
];

const INIT_RMS = [
    { id: "rm1", name: "Glycerin", supplier: "s1", price: 120.00 },
    { id: "rm1b", name: "Glycerin", supplier: "s2", price: 108.00 },
    { id: "rm2", name: "Cetyl Alcohol", supplier: "s2", price: 340.00 },
    { id: "rm2b", name: "Cetyl Alcohol", supplier: "s3", price: 360.00 },
    { id: "rm3", name: "Phenoxyethanol", supplier: "s1", price: 890.50 },
    { id: "rm3b", name: "Phenoxyethanol", supplier: "s4", price: 820.00 },
    { id: "rm4", name: "Sodium Hydroxide", supplier: "s1", price: 75.00 },
    { id: "rm5", name: "Water (DI)", supplier: "s3", price: 5.00 },
    { id: "rm6", name: "Carbomer 940", supplier: "s2", price: 560.00 },
    { id: "rm7", name: "Niacinamide", supplier: "s1", price: 1250.00 },
    { id: "rm7b", name: "Niacinamide", supplier: "s4", price: 1100.00 },
];

const INIT_PRODUCTS = [
    {
        id: "p1", code: "PRD-001", name: "Hydrating Day Cream", cat: "Cream", batchSize: 500,
        desc: "Lightweight moisturizer targeting 48hr hydration. Suitable for all skin types.",
        status: "trial",
        batches: [
            {
                id: "b1", bid: "PRD-001-T01", name: "Trial 1 — Base Formula", size: 100, type: "formula",
                status: "passed", notes: "Good texture. Slight stickiness — reduce glycerin next batch.",
                gloss: "", viscosity: "",
                formula: [
                    { rmId: "rm5", qty: 72, pct: 72 }, { rmId: "rm1", qty: 8, pct: 8 },
                    { rmId: "rm2", qty: 5, pct: 5 }, { rmId: "rm6", qty: 0.8, pct: 0.8 },
                    { rmId: "rm3", qty: 0.8, pct: 0.8 }
                ]
            },
            {
                id: "b2", bid: "PRD-001-T02", name: "Trial 2 — Reduced Glycerin + Niacinamide", size: 100,
                type: "formula", status: "testing", notes: "Reducing glycerin to 5%, adding niacinamide.",
                gloss: "", viscosity: "",
                formula: [
                    { rmId: "rm5", qty: 69, pct: 69 }, { rmId: "rm1", qty: 5, pct: 5 },
                    { rmId: "rm2", qty: 5, pct: 5 }, { rmId: "rm7", qty: 5, pct: 5 },
                    { rmId: "rm6", qty: 0.8, pct: 0.8 }, { rmId: "rm3", qty: 0.8, pct: 0.8 }
                ]
            },
        ]
    }
];

const INIT_ACTIVITY = [
    { msg: "Created batch PRD-001-T02 for Hydrating Day Cream", color: "#3B82F6", time: "2 hrs ago" },
    { msg: "PRD-001-T01 marked as Passed", color: "#10B981", time: "Yesterday" },
    { msg: "New product PRD-001 created", color: "#3B82F6", time: "2 days ago" },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmtINR = n =>
    "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const uid = () => "id" + Date.now() + Math.random().toString(36).slice(2, 6);

const PILL_MAP = {
    draft: ["#F3F4F6", "#4B5563", "#9CA3AF", "Draft"],
    testing: ["#EFF6FF", "#1D4ED8", "#3B82F6", "Testing"],
    passed: ["#ECFDF5", "#065F46", "#10B981", "Passed"],
    failed: ["#FEF2F2", "#991B1B", "#EF4444", "Failed"],
    finalized: ["#FFFBEB", "#92400E", "#2563EB", "Finalized"],
    development: ["#F3F4F6", "#64748B", "#9CA3AF", "Development"],
    trial: ["#F5F3FF", "#5B21B6", "#3B82F6", "In Trial"],
};

function Pill({ status }) {
    const [bg, color, dot, label] = PILL_MAP[status] || PILL_MAP.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            fontFamily: "ui-monospace, Consolas, monospace", background: bg, color
        }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }} />
            {label}
        </span>
    );
}

function Tag({ children, color = "blue" }) {
    const map = {
        blue: ["#EFF8FF", "#1E4A8A"], green: ["#ECFDF5", "#065F46"],
        amber: ["#FFFBEB", "#92400E"], gray: ["#F3F4F6", "#4B5563"],
        sky: ["#E0F7FF", "#0369A1"],
    };
    const [bg, c] = map[color] || map.blue;
    return (
        <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
            fontFamily: "ui-monospace, Consolas, monospace", background: bg, color: c, whiteSpace: "nowrap"
        }}>{children}</span>
    );
}

// ─── TOAST ──────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
    if (!msg) return null;
    const bg = type === "error" ? T.red : type === "success" ? T.green : T.navy;
    const icon = type === "error" ? "⚠ " : type === "success" ? "✓ " : "● ";
    return (
        <div style={{
            position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff",
            padding: "11px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
            boxShadow: "0 8px 28px rgba(15,27,45,.28)", zIndex: 300,
            display: "flex", alignItems: "center", gap: 8, maxWidth: 340,
            fontFamily: "'Inter',sans-serif",
        }}>{icon}{msg}</div>
    );
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }) {
    if (!open) return null;
    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, background: "rgba(15,27,45,.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 100, backdropFilter: "blur(4px)",
            }}>
            <div style={{
                background: T.card, borderRadius: 14,
                width: wide ? 700 : 580, maxWidth: "95vw", maxHeight: "88vh",
                overflowY: "auto", boxShadow: "0 24px 64px rgba(15,27,45,.28)",
            }}>
                <div style={{
                    padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    position: "sticky", top: 0, background: T.card, zIndex: 1, borderRadius: "14px 14px 0 0"
                }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
                    <button className="close-btn" onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer", color: T.muted, fontSize: 20,
                        border: "none", background: "transparent", lineHeight: 1
                    }}>×</button>
                </div>
                <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── FORM HELPERS ────────────────────────────────────────────────────────────
const FLabel = ({ children }) => (
    <div style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: ".9px", color: T.muted, marginBottom: 5
    }}>{children}</div>
);
const FInput = ({ style, ...p }) => (
    <input style={{
        padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7,
        fontSize: 13, fontFamily: "'Inter',sans-serif", color: T.text,
        background: T.card, outline: "none", width: "100%", ...style
    }} {...p} />
);
const FSelect = ({ children, ...p }) => (
    <select style={{
        padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7,
        fontSize: 13, fontFamily: "'Inter',sans-serif", color: T.text,
        background: T.card, outline: "none", width: "100%"
    }} {...p}>{children}</select>
);
const FTextarea = ({ style, ...p }) => (
    <textarea style={{
        padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7,
        fontSize: 13, fontFamily: "'Inter',sans-serif", color: T.text,
        background: T.card, outline: "none", width: "100%",
        resize: "vertical", minHeight: 70, lineHeight: 1.5, ...style
    }} {...p} />
);

// ─── BUTTON ──────────────────────────────────────────────────────────────────
function Btn({ variant = "primary", sm, onClick, children, style: s }) {
    return (
        <button 
            onClick={onClick} 
            className={`btn btn-${variant} ${sm ? 'btn-sm' : 'btn-lg'}`}
            style={s}
        >
            {children}
        </button>
    );
}

// ─── PANEL ───────────────────────────────────────────────────────────────────
function Panel({ title, action, children, style: s }) {
    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", ...s }}>
            {title && (
                <div style={{
                    padding: "11px 16px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#F9FAFB"
                }}>
                    <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "1.1px", color: T.muted
                    }}>{title}</span>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ state, onNav }) {
    const { rms, products, activity } = state;
    const totalBatches = products.reduce((a, p) => a + p.batches.length, 0);
    const finalized = products.reduce((a, p) => a + p.batches.filter(b => b.status === "finalized").length, 0);

    const stats = [
        { label: "Raw Materials", value: rms.length, hint: "in ingredient library", color: "#1D4ED8", ring: "s-blue" },
        { label: "Products", value: products.length, hint: "formulations tracked", color: T.amberDim, ring: "s-amber" },
        { label: "Trial Batches", value: totalBatches, hint: "across all products", color: T.purple, ring: "s-purple" },
        { label: "Finalized", value: finalized, hint: "formulas approved", color: T.green, ring: "s-green" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {stats.map(s => (
                    <div key={s.label} style={{
                        background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                        padding: "16px 18px", position: "relative", overflow: "hidden"
                    }}>
                        <div style={{
                            fontSize: 10, textTransform: "uppercase", letterSpacing: "1.3px",
                            color: T.muted, fontWeight: 600
                        }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 600, color: s.color, margin: "4px 0 4px", lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{s.hint}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
                {/* Products table */}
                <Panel title="Products Overview"
                    action={<Btn variant="ghost" sm onClick={() => onNav("products")}>View All →</Btn>}>
                    {!products.length
                        ? <EmptyState icon="◈" title="No products yet" hint="Create your first formulation to get started" />
                        : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>{["Code", "Product", "Category", "Batches", "Status", ""].map(h => (
                                    <th key={h} style={{
                                        textAlign: "left", fontSize: 10, textTransform: "uppercase",
                                        letterSpacing: 1, color: T.muted, fontWeight: 700, padding: "9px 13px",
                                        background: "#F9FAFB", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap"
                                    }}>{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id}>
                                        <td style={{
                                            padding: "11px 13px", fontSize: 13, borderBottom: `1px solid #F3F4F6`,
                                            fontFamily: "ui-monospace, Consolas, monospace"
                                        }}>{p.code}</td>
                                        <td style={{ padding: "11px 13px", fontWeight: 600, borderBottom: `1px solid #F3F4F6` }}>{p.name}</td>
                                        <td style={{ padding: "11px 13px", borderBottom: `1px solid #F3F4F6` }}><Tag color="blue">{p.cat || "—"}</Tag></td>
                                        <td style={{ padding: "11px 13px", borderBottom: `1px solid #F3F4F6` }}><Tag color="gray">{p.batches.length}</Tag></td>
                                        <td style={{ padding: "11px 13px", borderBottom: `1px solid #F3F4F6` }}><Pill status={p.status} /></td>
                                        <td style={{ padding: "11px 13px", borderBottom: `1px solid #F3F4F6` }}>
                                            <Btn variant="ghost" sm onClick={() => onNav("product-detail", { pid: p.id })}>Open →</Btn>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    }
                </Panel>

                {/* Activity */}
                <Panel title="Activity Feed">
                    <div style={{ padding: "4px 16px 16px" }}>
                        {!activity.length
                            ? <EmptyState icon="📋" title="No activity yet" />
                            : activity.map((a, i) => (
                                <div key={i} style={{
                                    display: "flex", gap: 12, padding: "10px 0",
                                    borderBottom: i < activity.length - 1 ? `1px solid #F3F4F6` : "none"
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        background: a.color, flexShrink: 0, marginTop: 4
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>{a.msg}</div>
                                        <div style={{
                                            fontSize: 10, color: T.muted, fontFamily: "ui-monospace, Consolas, monospace",
                                            marginTop: 2
                                        }}>{a.time}</div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </Panel>
            </div>
        </div>
    );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, hint }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 24px", color: T.muted, gap: 8, textAlign: "center"
        }}>
            <div style={{ fontSize: 32, opacity: .35 }}>{icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</div>
            {hint && <div style={{ fontSize: 12, maxWidth: 220, lineHeight: 1.5 }}>{hint}</div>}
        </div>
    );
}

// ─── RAW MATERIALS ────────────────────────────────────────────────────────────
function RawMaterials({ state, onNav, onAddRM }) {
    const [q, setQ] = useState("");
    const filtered = state.rms.filter(rm =>
        !q || rm.name.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <input
                        value={q} onChange={e => setQ(e.target.value)}
                        placeholder="Search by name…"
                        className="search-input"
                        style={{
                            width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${T.border}`,
                            borderRadius: 7, fontSize: 13, fontFamily: "'Inter',sans-serif", background: T.card,
                            color: T.text, outline: "none"
                        }}
                    />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
                        position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                        color: T.muted, width: 14, height: 14, pointerEvents: "none", transition: "color 0.2s"
                    }} className="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <Btn onClick={onAddRM}>+ Add Material</Btn>
            </div>

            {/* Header row */}
            {filtered.length > 0 && (
                <div style={{
                    display: "flex", alignItems: "center", padding: "5px 18px 7px",
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: T.muted
                }}>
                    <div style={{ flex: 1 }}>Material</div>
                    <div style={{ flex: "0 0 200px" }}>Supplier</div>
                    <div style={{ flex: "0 0 140px", textAlign: "right" }}>Price / kg</div>
                </div>
            )}

            {!filtered.length
                ? <EmptyState icon="⬡" title="No raw materials found" hint="Add your first ingredient" />
                : filtered.map((rm, i) => {
                    const sup = state.suppliers.find(x => x.id === rm.supplier);
                    return (
                        <div
                            key={rm.id}
                            className="clickable-row"
                            onClick={() => onNav("rm-detail", { rmId: rm.id })}
                            style={{
                                display: "flex", alignItems: "center", background: T.card,
                                border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px",
                                cursor: "pointer", transition: "all .15s",
                            }}
                        >
                            <div style={{ flex: 1, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center" }}>
                                <span style={{ color: T.muted, marginRight: 12, fontSize: 13, fontFamily: "ui-monospace, Consolas, monospace" }}>{i + 1}.</span>
                                {rm.name}
                            </div>
                            <div style={{ flex: "0 0 200px", fontSize: 12, color: T.muted, fontWeight: 500 }}>
                                {sup ? sup.name : rm.supplier || "No supplier"}
                            </div>
                            <div style={{
                                flex: "0 0 140px", textAlign: "right", fontSize: 14,
                                fontWeight: 700, color: T.amberDim, letterSpacing: "-0.3px"
                            }}>
                                {fmtINR(rm.price)}
                            </div>
                        </div>
                    );
                })
            }
            
            <button className="fab-btn" onClick={onAddRM} style={{
                position: "fixed", bottom: 32, right: 32, background: "#18181B", color: "white",
                border: "none", borderRadius: 30, padding: "14px 24px", fontSize: 14, fontWeight: 700,
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, zIndex: 100
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Material
            </button>
        </div>
    );
}

// ─── RM DETAIL ────────────────────────────────────────────────────────────────
function RMDetail({ state, rmId, onBack, onUpdateRM, onDeleteRM }) {
    const rm = state.rms.find(x => x.id === rmId);
    if (!rm) return <EmptyState icon="⬡" title="Not found" />;
    const sup = state.suppliers.find(x => x.id === rm.supplier);

    const [isEditing, setIsEditing] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button className="back-btn" onClick={onBack} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                    color: T.muted, cursor: "pointer", padding: "4px 0", textTransform: "uppercase",
                    letterSpacing: ".5px", border: "none", background: "none"
                }}>← Back to Raw Materials</button>
                
                <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="ghost" sm onClick={() => setIsEditing(true)}>✎ Edit</Btn>
                    <Btn variant="danger" sm onClick={() => {
                        if (confirm("Are you sure you want to delete this material?")) {
                            onDeleteRM(rmId);
                        }
                    }}>Delete</Btn>
                </div>
            </div>

            <Panel title="Raw Material Info">
                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                    {[
                        ["Material Name", rm.name],
                        ["Supplier", sup?.name || rm.supplier || "—"],
                        ["Price Purchased", fmtINR(rm.price)],
                    ].map(([l, v]) => (
                        <div key={l}>
                            <div style={{
                                fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
                                fontWeight: 700, color: T.muted, marginBottom: 3
                            }}>{l}</div>
                            <div style={{
                                fontSize: 13, fontWeight: 600, color: T.text,
                                fontFamily: l === "Price Purchased" ? "ui-monospace, Consolas, monospace" : undefined,
                                color: l === "Price Purchased" ? T.amberDim : T.text
                            }}>{v}</div>
                        </div>
                    ))}
                </div>
            </Panel>

            <EditRMModal open={isEditing} onClose={() => setIsEditing(false)} rm={rm} onSave={(data) => { onUpdateRM(rmId, data); setIsEditing(false); }} />
        </div>
    );
}

// ─── EDIT RM MODAL ─────────────────────────────────────────────────────────────
function EditRMModal({ open, onClose, rm, onSave }) {
    const [name, setName] = useState("");
    const [sup, setSup] = useState("");
    const [price, setPrice] = useState("");

    useEffect(() => {
        if (open && rm) {
            setName(rm.name || "");
            setSup(rm.supplier || "");
            setPrice(rm.price || "");
        }
    }, [open, rm]);

    const save = () => {
        if (!name || !sup || !price) return;
        onSave({ name, supplier: sup, price: parseFloat(price) });
    };

    return (
        <Modal open={open} onClose={onClose} title="Edit Raw Material">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><FLabel>Material Name *</FLabel><FInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Glycerin" /></div>
                <div><FLabel>Supplier Name *</FLabel>
                    <FInput value={sup} onChange={e => setSup(e.target.value)} placeholder="e.g. ABC Chemicals" />
                </div>
                <div><FLabel>Price Purchased (₹ / kg) *</FLabel><FInput type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn onClick={save}>Save Changes</Btn>
            </div>
        </Modal>
    );
}

// ─── PRODUCTS LIST ────────────────────────────────────────────────────────────
function Products({ state, onNav, onAddProduct }) {
    const [q, setQ] = useState("");
    
    const filtered = state.products.filter(p =>
        !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <input value={q} onChange={e => setQ(e.target.value)}
                        placeholder="Search products…"
                        className="search-input"
                        style={{
                            width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${T.border}`,
                            borderRadius: 7, fontSize: 13, fontFamily: "'Inter',sans-serif", background: T.card,
                            color: T.text, outline: "none"
                        }} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
                        position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                        color: T.muted, width: 14, height: 14, pointerEvents: "none", transition: "color 0.2s"
                    }} className="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <Btn onClick={onAddProduct}>+ New Product</Btn>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!filtered.length
                    ? <EmptyState icon="◈" title="No products found" hint="Create a product to begin" />
                    : filtered.map((p, i) => {
                        return (
                            <div key={p.id} onClick={() => onNav("product-detail", { pid: p.id })}
                                className="clickable-row"
                                style={{
                                    display: "flex", alignItems: "center", background: T.card,
                                    border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px",
                                    cursor: "pointer", transition: "all .15s",
                                }}>
                                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center" }}>
                                    <span style={{ color: T.muted, marginRight: 12, fontSize: 13, fontFamily: "ui-monospace, Consolas, monospace" }}>{i + 1}.</span>
                                    {p.name}
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────────────────
function ProductDetail({ state, pid, onBack, onOpenBatch, onAddBatch, onDuplicate }) {
    const p = state.products.find(x => x.id === pid);
    if (!p) return <EmptyState icon="◈" title="Not found" />;
    const formulaBatches = p.batches.filter(b => b.type === "formula" || !b.type);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button className="back-btn" onClick={onBack} style={{
                        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                        color: T.muted, cursor: "pointer", padding: "4px 0", textTransform: "uppercase",
                        letterSpacing: ".5px", border: "none", background: "none"
                    }}>← Products</button>
                    <span style={{ color: "#D1D5DB" }}>/</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="ghost" sm onClick={() => onDuplicate(pid)}>⊕ Duplicate Last</Btn>
                </div>
            </div>

            <div style={{ display: "flex", gap: 18 }}>
                {/* Main */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Panel title="Formula Trials">
                        {!formulaBatches.length
                            ? <EmptyState icon="🧪" title="No batches yet" hint='Click "+ New Trial Batch" to begin' />
                            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead><tr>{["Batch ID", "Name"].map(h => (
                                    <th key={h} style={{
                                        textAlign: "left", fontSize: 10, textTransform: "uppercase",
                                        letterSpacing: 1, color: T.muted, fontWeight: 700, padding: "9px 13px",
                                        background: "#F9FAFB", borderBottom: `1px solid ${T.border}`
                                    }}>{h}</th>
                                ))}</tr></thead>
                                <tbody>
                                    {formulaBatches.map(b => (
                                        <tr key={b.id} className="clickable-tr" style={{ cursor: "pointer", transition: "all .15s" }} onClick={() => onOpenBatch(pid, b.id)}>
                                            <td style={{ padding: "11px 13px", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12, borderBottom: `1px solid #F3F4F6` }}>{b.bid}</td>
                                            <td style={{ padding: "11px 13px", fontWeight: 600, maxWidth: 200, borderBottom: `1px solid #F3F4F6` }}>{b.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        }
                    </Panel>
                </div>


            </div>
            
            <button className="fab-btn" onClick={() => onAddBatch(pid)} style={{
                position: "fixed", bottom: 32, right: 32, background: "#18181B", color: "white",
                border: "none", borderRadius: 30, padding: "14px 24px", fontSize: 14, fontWeight: 700,
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, zIndex: 100
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Trial Batch
            </button>
        </div>
    );
}

// ─── REMARKS EDITOR ───────────────────────────────────────────────────────────
function RemarksEditor({ value, onChange }) {
    const [tamilMode, setTamilMode] = useState(false);
    const [activeColor, setActiveColor] = useState("#111827");
    const savedRange = useRef(null);
    const editorRef = useRef(null);

    // Vowels and Consonants for Tamil
    const VOWELS = ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ", "ஃ"];
    const CONSONANTS = ["க", "ங", "ச", "ஞ", "ட", "ண", "த", "ந", "ப", "ம", "ய", "ர", "ல", "வ", "ழ", "ள", "ற", "ன"];

    useEffect(() => {
        const handleSelChange = () => {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
                savedRange.current = sel.getRangeAt(0).cloneRange();
            }
        };
        document.addEventListener("selectionchange", handleSelChange);
        return () => document.removeEventListener("selectionchange", handleSelChange);
    }, []);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const execCmd = (cmd, val) => {
        if (!editorRef.current) return;
        
        // Force focus first
        editorRef.current.focus();
        
        // Restore range safely
        const sel = window.getSelection();
        let shouldSelectAll = false;

        if (savedRange.current) {
            try {
                sel.removeAllRanges();
                sel.addRange(savedRange.current);
                if (savedRange.current.collapsed) {
                    shouldSelectAll = true;
                }
            } catch (e) {
                console.error("Range restore failed", e);
            }
        } else {
            shouldSelectAll = true;
        }

        // Auto-select all text robustly if nothing was highlighted
        if (shouldSelectAll) {
            document.execCommand('selectAll', false, null);
        }
        
        // Execute
        const res = document.execCommand(cmd, false, val);
        console.log(`Executed ${cmd} with val ${val}. Success: ${res}.`);
        
        // Update selection snapshot
        if (sel.rangeCount > 0) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
        
        // Inform React
        onChange(editorRef.current.innerHTML);
    };

    const insertText = (char) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        const sel = window.getSelection();
        if (savedRange.current) {
            try {
                sel.removeAllRanges();
                sel.addRange(savedRange.current);
            } catch(e){}
        }
        document.execCommand('insertText', false, char);
        if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
        onChange(editorRef.current.innerHTML);
    };

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || "";
        }
    }, [value]);

    return (
        <div style={{ marginTop: 32, border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", background: "white" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E7EB", background: "#F3F4F6", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px" }}>Remarks</div>
                <div style={{ width: 1, height: 16, background: "#D1D5DB" }} />
                
                <button title="Bold" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('bold')} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 800 }}>B</button>
                <button title="Italic" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('italic')} style={{ border: "none", background: "none", cursor: "pointer", fontStyle: "italic" }}>I</button>
                <button title="Underline" onMouseDown={e => e.preventDefault()} onClick={() => execCmd('underline')} style={{ border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}>U</button>
                
                <div style={{ width: 1, height: 16, background: "#D1D5DB" }} />
                
                <div style={{ display: "flex", alignItems: "center", gap: 6 }} title="Font Size">
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700 }}>A</span>
                    <input type="range" min="1" max="7" defaultValue="3" 
                        onChange={e => execCmd('fontSize', e.target.value)}
                        style={{ width: 70, cursor: "pointer" }} />
                    <span style={{ fontSize: 14, color: "#111827", fontWeight: 700 }}>A</span>
                </div>

                <div style={{ width: 1, height: 16, background: "#D1D5DB" }} />
                
                <label onMouseDown={e => e.preventDefault()} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={tamilMode} onChange={e => setTamilMode(e.target.checked)} />
                    Tamil Keyboard
                </label>
            </div>

            {tamilMode && (
                <div style={{ padding: 12, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {VOWELS.map(v => <button key={v} onMouseDown={e => e.preventDefault()} onClick={() => insertText(v)} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "white", borderRadius: 4, cursor: "pointer", fontSize: 16 }}>{v}</button>)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {CONSONANTS.map(v => <button key={v} onMouseDown={e => e.preventDefault()} onClick={() => insertText(v)} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "white", borderRadius: 4, cursor: "pointer", fontSize: 16 }}>{v}</button>)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('்')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Pulli ( ்)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ா')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Thunai ( ா)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ி')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Ki ( ி)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ீ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Kii ( ீ)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ு')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Ku ( ு)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ூ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Kuu ( ூ)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ெ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Ke ( ெ)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ே')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Kee ( ே)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ை')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Kai ( ை)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ொ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Ko ( ொ)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ோ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Koo ( ோ)</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => insertText('ௌ')} style={{ padding: "4px 8px", border: "1px solid #D1D5DB", background: "#f0f0f0", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>Kow ( ௌ)</button>
                    </div>
                </div>
            )}

            <div 
                ref={editorRef}
                contentEditable
                onInput={e => {
                    onChange(e.currentTarget.innerHTML);
                }}
                style={{ padding: 16, minHeight: 120, outline: "none", fontSize: 14, fontFamily: "inherit" }}
            />
        </div>
    );
}

// ─── BATCH DETAIL (PRICE ESTIMATE) ───────────────────────────────────────────
function BatchDetail({ state, pid, bid, onBack, onSave, showToast }) {
    const p = state.products.find(x => x.id === pid);
    const b = p?.batches.find(x => x.id === bid);

    const [batchName, setBatchName] = useState(b?.name || "");
    const [required, setRequired] = useState(String(b?.size || 100));
    const [gloss, setGloss] = useState(b?.gloss || "");
    const [viscosity, setViscosity] = useState(b?.viscosity || "");
    const [remarks, setRemarks] = useState(b?.remarks || "");
    const [isEditingRemarks, setIsEditingRemarks] = useState(false);
    const [rows, setRows] = useState(() =>
        (b?.formula || []).map(r => ({ _id: uid(), rmId: r.rmId, qty: String(r.qty) }))
    );

    const addRow = () => setRows(rs => [...rs, { _id: uid(), rmId: "", qty: "" }]);
    const delRow = id => setRows(rs => rs.filter(r => r._id !== id));
    const updateRow = (id, field, val) => setRows(rs => rs.map(r => r._id === id ? { ...r, [field]: val } : r));

    // Calc totals
    let totalCost = 0;
    const rowsCalc = rows.map(r => {
        const rm = state.rms.find(x => x.id === r.rmId);
        const qty = parseFloat(r.qty) || 0;
        const rate = rm?.price || 0;
        const cost = qty * rate;
        totalCost += cost;
        return { ...r, rmObj: rm, rate, cost };
    });
    const req = parseFloat(required) || totalCost || 1;
    const costPerKg = totalCost / req;
    const totalQty = rowsCalc.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);

    const handleSave = () => {
        const formula = rowsCalc
            .filter(r => r.rmId && parseFloat(r.qty) > 0)
            .map(r => ({ rmId: r.rmId, qty: parseFloat(r.qty), pct: (parseFloat(r.qty) / req) * 100 }));
        onSave(pid, bid, { name: batchName, size: req, gloss, viscosity, formula, remarks });
        showToast("Batch saved", "success");
    };

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });

    if (!p || !b) return <EmptyState icon="◈" title="Batch not found" />;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button className="back-btn" onClick={onBack} style={{
                        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                        color: T.muted, cursor: "pointer", padding: "4px 0", textTransform: "uppercase",
                        letterSpacing: ".5px", border: "none", background: "none"
                    }}>← Product</button>
                    <span style={{ color: "#D1D5DB" }}>/</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.bid}</span>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", background: "#FFFFFF", border: "1px solid #E5E7EB", color: "#4B5563", fontSize: 13, padding: "8px 16px", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Print Invoice
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ display: "flex", alignItems: "center", fontSize: 13, padding: "8px 20px", borderRadius: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save Estimate
                    </button>
                </div>
            </div>

            {/* Invoice Card */}
            <div style={{
                background: "white", padding: 40, fontFamily: "'Inter',sans-serif",
                color: "#111827", boxShadow: "0 4px 20px rgba(0,0,0,.05)",
                position: "relative", overflow: "hidden",
                maxWidth: 1100, margin: "0 auto", width: "100%",
                border: `1px solid #E5E7EB`, borderRadius: 8
            }}>
                {/* Watermark */}
                <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%) rotate(-30deg)",
                    fontSize: 140, fontWeight: 800, color: "rgba(0,0,0,.02)",
                    pointerEvents: "none", whiteSpace: "nowrap", zIndex: 1, userSelect: "none"
                }}>CONFIDENTIAL</div>

                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                    borderBottom: "2px solid #111827", paddingBottom: 12, marginBottom: 24, position: "relative", zIndex: 2
                }}>
                    <div>
                        <img src="./logo.png" alt="ROALUX Logo" width="160" height="40" style={{ height: 40, width: "auto", objectFit: "contain" }} />
                        <div style={{
                            fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
                            color: "#6B7280", fontWeight: 600, marginTop: 4
                        }}>Paint Recipe System</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>Price Estimate</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Modified: {today}</div>
                    </div>
                </div>

                {/* Meta grid */}
                <div style={{ display: "flex", gap: 32, marginBottom: 32, position: "relative", zIndex: 2, flexWrap: "wrap" }}>
                    {[
                        {
                            label: "Product", el: <input value={p.name} readOnly style={{
                                border: "1px solid transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                                padding: "4px 8px", margin: "-4px -8px", borderRadius: 4, background: "transparent",
                                color: "#888", width: 260
                            }} />
                        },
                        {
                            label: "Batch Name", el: <input value={batchName} onChange={e => setBatchName(e.target.value)}
                                style={{
                                    border: "1px solid #E5E7EB", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                                    padding: "4px 8px", margin: "-4px -8px", borderRadius: 4, background: "transparent", color: "#111827",
                                    outline: "none", width: 340
                                }} placeholder="Trial 1" />
                        },
                        {
                            label: "Required (kg)", el: <input value={required} onChange={e => { setRequired(e.target.value); }}
                                style={{
                                    border: "1px solid #E5E7EB", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 15, fontWeight: 700,
                                    padding: "4px 8px", margin: "-4px -8px", borderRadius: 4, background: "transparent", color: "#111827",
                                    outline: "none", width: 80
                                }} />
                        },
                        {
                            label: "Gloss", el: <input value={gloss} onChange={e => setGloss(e.target.value)}
                                style={{
                                    border: "1px solid #E5E7EB", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                                    padding: "4px 8px", margin: "-4px -8px", borderRadius: 4, background: "transparent", color: "#111827",
                                    outline: "none", width: 100
                                }} />
                        },
                        {
                            label: "Viscosity", el: <input value={viscosity} onChange={e => setViscosity(e.target.value)}
                                style={{
                                    border: "1px solid #E5E7EB", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                                    padding: "4px 8px", margin: "-4px -8px", borderRadius: 4, background: "transparent", color: "#111827",
                                    outline: "none", width: 120
                                }} />
                        },
                    ].map(({ label, el }) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</span>
                            {el}
                        </div>
                    ))}
                </div>



                {/* Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", position: "relative", zIndex: 10 }}>
                    <thead>
                        <tr>
                            <th style={{ width: 40, textAlign: "center", fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", padding: "12px 16px", borderBottom: "1px solid #E5E7EB", background: "#F3F4F6" }}>#</th>
                            {["Ingredient", "Weight (kg)", "Rate/Kg", "Cost", ""].map((h, i) => (
                                <th key={h} style={{
                                    textAlign: i >= 1 && i <= 3 ? "right" : "left",
                                    fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
                                    letterSpacing: ".5px", padding: "12px 16px",
                                    borderBottom: "1px solid #E5E7EB", background: "#F3F4F6"
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rowsCalc.map((r, i) => {
                            const sup = r.rmObj ? state.suppliers.find(x => x.id === r.rmObj.supplier) : null;
                            return (
                                <tr key={r._id}>
                                    <td style={{ textAlign: "center", padding: "12px 16px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13, color: T.muted }}>
                                        {i + 1}.
                                    </td>
                                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle" }}>
                                        <div style={{ position: "relative", zIndex: r.showList ? 50 : 1 }}>
                                            <input
                                                placeholder="Search ingredient…"
                                                value={r.rmObj && !r.searchText ? r.rmObj.name : r.searchText || ""}
                                                onChange={e => {
                                                    updateRow(r._id, "rmId", "");
                                                    updateRow(r._id, "searchText", e.target.value);
                                                    updateRow(r._id, "showList", true);
                                                }}
                                                onFocus={() => updateRow(r._id, "showList", true)}
                                                onBlur={() => setTimeout(() => updateRow(r._id, "showList", false), 200)}
                                                style={{
                                                    width: "100%", border: "1px solid #E5E7EB", background: "#F3F4F6",
                                                    padding: "8px 12px", borderRadius: 6, fontFamily: "'Inter',sans-serif",
                                                    fontSize: 13, fontWeight: 600, color: "#111827", outline: "none",
                                                }}
                                            />
                                            {r.showList && (
                                                <div style={{
                                                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                                                    background: "white", border: "1px solid #E5E7EB", borderRadius: 6,
                                                    maxHeight: 200, overflowY: "auto", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                    textAlign: "left"
                                                }}>
                                                    {state.rms.filter(rm => !r.searchText || rm.name.toLowerCase().includes(r.searchText.toLowerCase())).map(rm => {
                                                        const s = state.suppliers.find(x => x.id === rm.supplier);
                                                        return (
                                                            <div key={rm.id}
                                                                onClick={() => {
                                                                    updateRow(r._id, "rmId", rm.id);
                                                                    updateRow(r._id, "showList", false);
                                                                    updateRow(r._id, "searchText", "");
                                                                }}
                                                                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", transition: "background .15s" }}
                                                                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                                                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                                                            >
                                                                <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>{rm.name}</div>
                                                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s?.name || rm.supplier || "Unknown"}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {sup && <div style={{ fontSize: 11, color: "#9CA3AF", paddingLeft: 4, fontWeight: 500, marginTop: 4 }}>{sup.name}</div>}
                                    </td>
                                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", textAlign: "right" }}>
                                        <input
                                            type="number" value={r.qty}
                                            onChange={e => updateRow(r._id, "qty", e.target.value)}
                                            style={{
                                                width: 80, textAlign: "right", fontFamily: "inherit",
                                                border: "1px solid #E5E7EB", background: "#F3F4F6",
                                                padding: "6px 12px", borderRadius: 6, fontSize: 14, fontWeight: 600, outline: "none"
                                            }} />
                                    </td>
                                    <td style={{
                                        padding: "12px 16px", borderBottom: "1px solid #F3F4F6", textAlign: "right",
                                        fontFamily: "ui-monospace, Consolas, monospace", color: T.muted, fontSize: 13
                                    }}>
                                        {r.rmObj ? fmtINR(r.rate) : "—"}
                                    </td>
                                    <td style={{
                                        padding: "12px 16px", borderBottom: "1px solid #F3F4F6", textAlign: "right",
                                        fontFamily: "ui-monospace, Consolas, monospace", fontWeight: 600, fontSize: 14
                                    }}>
                                        {r.cost > 0 ? fmtINR(r.cost) : "0.00"}
                                    </td>
                                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", textAlign: "right" }}>
                                        <button className="del-btn" onClick={() => delRow(r._id)} style={{
                                            width: 28, height: 28, borderRadius: 6, border: "1px solid transparent",
                                            background: "transparent", color: "#9CA3AF", display: "inline-flex",
                                            alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer"
                                        }}>×</button>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr style={{ background: "#F9FAFB", borderTop: "2px solid #E5E7EB" }}>
                            <td colSpan={2} style={{ padding: "16px 16px", textAlign: "right", fontWeight: 700, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>Total</td>
                            <td style={{ padding: "16px 12px", textAlign: "right", fontWeight: 800, fontSize: 16, fontFamily: "ui-monospace, Consolas, monospace" }}>{totalQty.toFixed(2)}</td>
                            <td></td>
                            <td style={{ padding: "16px 16px", textAlign: "right", fontWeight: 800, fontSize: 16, fontFamily: "ui-monospace, Consolas, monospace" }}>{fmtINR(totalCost)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ marginTop: 16, position: "relative", zIndex: 2 }}>
                    <Btn variant="ghost" sm onClick={addRow}>+ Add Ingredient</Btn>
                </div>

                <div style={{ position: "relative", zIndex: 2 }}>
                    {isEditingRemarks ? (
                        <div style={{ marginTop: 32 }}>
                            <RemarksEditor value={remarks} onChange={setRemarks} />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                <Btn sm onClick={() => setIsEditingRemarks(false)}>Done Editing</Btn>
                            </div>
                        </div>
                    ) : remarks ? (
                        <div style={{ marginTop: 32 }}>
                            <div onClick={() => setIsEditingRemarks(true)} className="remarks-preview-box" style={{
                                padding: 16, border: "1px dashed #E5E7EB", borderRadius: 8, cursor: "pointer",
                                background: "#F9FAFB", minHeight: 60, transition: "all 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#9CA3AF"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}
                            >
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>Remarks</div>
                                <div dangerouslySetInnerHTML={{ __html: remarks }} style={{ fontSize: 14, fontFamily: "inherit" }} />
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginTop: 32 }}>
                            <Btn variant="ghost" sm onClick={() => setIsEditingRemarks(true)}>+ Add Remarks</Btn>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── ADD RM MODAL ─────────────────────────────────────────────────────────────
function AddRMModal({ open, onClose, suppliers, onSave }) {
    const [name, setName] = useState("");
    const [sup, setSup] = useState("");
    const [price, setPrice] = useState("");

    const save = () => {
        if (!name || !sup || !price) return;
        onSave({ name, supplier: sup, price: parseFloat(price) });
        setName(""); setSup(""); setPrice("");
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title="Add Raw Material">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><FLabel>Material Name *</FLabel><FInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Glycerin" /></div>
                <div><FLabel>Supplier Name *</FLabel>
                    <FInput value={sup} onChange={e => setSup(e.target.value)} placeholder="e.g. ABC Chemicals" />
                </div>
                <div><FLabel>Price Purchased (₹ / kg) *</FLabel><FInput type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn onClick={save}>Save Material</Btn>
            </div>
        </Modal>
    );
}

// ─── ADD PRODUCT MODAL ────────────────────────────────────────────────────────
function AddProductModal({ open, onClose, onSave }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [cat, setCat] = useState("");
    const [bs, setBs] = useState("");
    const [desc, setDesc] = useState("");
    const CATS = ["Cream", "Lotion", "Serum", "Gel", "Shampoo", "Conditioner", "Cleanser", "Mask", "Oil", "Tablet", "Capsule", "Syrup", "Powder", "Other"];

    const save = () => {
        if (!name || !code) return;
        onSave({ code, name, cat: cat || "Other", batchSize: parseFloat(bs) || 100, desc, status: "development", batches: [] });
        setCode(""); setName(""); setCat(""); setBs(""); setDesc("");
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title="New Product">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><FLabel>Product Code *</FLabel><FInput value={code} onChange={e => setCode(e.target.value)} placeholder="PRD-001" /></div>
                    <div><FLabel>Product Name *</FLabel><FInput value={name} onChange={e => setName(e.target.value)} placeholder="Hydrating Day Cream" /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><FLabel>Category</FLabel>
                        <FSelect value={cat} onChange={e => setCat(e.target.value)}>
                            <option value="">Select…</option>
                            {CATS.map(c => <option key={c}>{c}</option>)}
                        </FSelect>
                    </div>
                    <div><FLabel>Standard Batch Size (kg)</FLabel><FInput type="number" value={bs} onChange={e => setBs(e.target.value)} placeholder="500" /></div>
                </div>
                <div><FLabel>Target Profile / Description</FLabel>
                    <FTextarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Intended use, performance claims…" />
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn onClick={save}>Create Product</Btn>
            </div>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
    const [rms, setRms] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/data")
            .then(res => res.json())
            .then(data => {
                setSuppliers(data.suppliers);
                setRms(data.rms);
                setProducts(data.products);
                setActivity(data.activity);
                setLoaded(true);
            })
            .catch(err => {
                console.error("Failed to load DB data, falling back to init", err);
                setRms(INIT_RMS);
                setProducts(INIT_PRODUCTS);
                setSuppliers(INIT_SUPPLIERS);
                setActivity(INIT_ACTIVITY);
                setLoaded(true);
            });
    }, []);

    // Sync to DB when state changes
    useEffect(() => {
        if (!loaded) return;
        const timer = setTimeout(() => {
            fetch("/api/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ products, rms, activity })
            }).catch(e => console.error("Sync error", e));
        }, 500);
        return () => clearTimeout(timer);
    }, [products, rms, activity, loaded]);

    const [view, setView] = useState("rawmaterials");   // current view name
    const [viewParams, setViewParams] = useState({}); // { pid, bid, rmId }

    const [toast, setToast] = useState(null);
    const [showAddRM, setShowAddRM] = useState(false);
    const [showAddProd, setShowAddProd] = useState(false);

    const showToast = useCallback((msg, type = "") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    }, []);

    const logActivity = (msg, color = "#3B82F6") => {
        setActivity(a => [{ msg, color, time: "Just now" }, ...a.slice(0, 19)]);
    };

    const navTo = (v, params = {}) => {
        setView(v);
        setViewParams(params);
    };

    // ── Mutations ──
    const addRM = ({ name, supplier, price }) => {
        setRms(rs => [...rs, { id: uid(), name, supplier, price }]);
        logActivity(`Added RM: ${name}`, "#38BDF8");
        showToast("Raw material saved", "success");
    };

    const updateRM = (id, data) => {
        setRms(rs => rs.map(r => r.id === id ? { ...r, ...data } : r));
        logActivity(`Updated RM: ${data.name}`, "#38BDF8");
        showToast("Raw material updated", "success");
    };

    const deleteRM = (id) => {
        setRms(rs => rs.filter(r => r.id !== id));
        logActivity(`Deleted RM`, "#EF4444");
        showToast("Raw material deleted", "success");
        navTo("rawmaterials");
    };

    const addProduct = (prod) => {
        const p = { ...prod, id: uid() };
        setProducts(ps => [...ps, p]);
        logActivity(`New product created: ${p.name}`, T.purple);
        showToast("Product created", "success");
    };

    const addBatch = (pid) => {
        setProducts(ps => ps.map(p => {
            if (p.id !== pid) return p;
            const nextN = (p.batches.length + 1).toString().padStart(2, "0");
            const b = {
                id: uid(), bid: `${p.code}-T${nextN}`, name: `Trial ${nextN}`,
                type: "formula", size: p.batchSize || 100, status: "draft",
                notes: "", gloss: "", viscosity: "", formula: []
            };
            logActivity(`New batch ${b.bid} created`, T.sky);
            return { ...p, batches: [...p.batches, b] };
        }));
        // Open the new batch
        setProducts(ps => {
            const p = ps.find(x => x.id === pid);
            const b = p.batches[p.batches.length - 1];
            navTo("batch-detail", { pid, bid: b.id });
            return ps;
        });
    };

    const duplicateBatch = (pid) => {
        setProducts(ps => ps.map(p => {
            if (p.id !== pid || !p.batches.length) return p;
            const last = p.batches[p.batches.length - 1];
            const nextN = (p.batches.length + 1).toString().padStart(2, "0");
            const b = {
                ...JSON.parse(JSON.stringify(last)),
                id: uid(), bid: `${p.code}-T${nextN}`,
                name: `Trial ${nextN} (Copy)`, status: "draft"
            };
            navTo("batch-detail", { pid, bid: b.id });
            logActivity(`Duplicated batch as ${b.bid}`, T.amber);
            return { ...p, batches: [...p.batches, b] };
        }));
    };

    const saveBatch = (pid, bid, data) => {
        setProducts(ps => ps.map(p => {
            if (p.id !== pid) return p;
            const updated = p.batches.map(b => {
                if (b.id !== bid) return b;
                return { ...b, ...data };
            });
            const newStatus = p.status === "development" ? "trial" : p.status;
            return { ...p, batches: updated, status: newStatus };
        }));
    };

    // ── Sidebar nav items ──
    const NAV = [
        { id: "rawmaterials", label: "Raw Materials", icon: "●", badge: rms.length, badgeColor: "#3B82F6" },
        { id: "products", label: "Proforma Invoice", icon: "●", badge: products.length, badgeColor: T.amber },
    ];

    const activeNavId = {
        rawmaterials: "rawmaterials",
        "rm-detail": "rawmaterials", products: "products",
        "product-detail": "products", "batch-detail": "products",
    }[view] || "rawmaterials";

    const state = { rms, products, suppliers, activity };

    if (!loaded) return <div style={{ padding: 40, fontFamily: "'Inter',sans-serif" }}>Loading database...</div>;

    return (
        <div style={{
            fontFamily: "'Inter',sans-serif", background: T.bg, color: T.text,
            height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden"
        }}>

            {/* ─── TOP NAVBAR ─── */}
            <div className="no-print" style={{
                background: T.navy, display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0, height: 64, padding: "0 24px", borderBottom: "1px solid #27272A"
            }}>
                {/* Logo & Brand */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <img src="./logo.png" alt="ROALUX Logo" width="128" height="32" style={{ height: 32, width: "auto", objectFit: "contain" }} />
                    <div style={{
                        fontSize: 11, color: "rgba(255,255,255,.4)", textTransform: "uppercase",
                        letterSpacing: "1.5px", fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,.15)", paddingLeft: 14
                    }}>Estimator v2</div>
                </div>

                {/* Nav Links */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {NAV.map(n => {
                        const isActive = n.id === activeNavId;
                        return (
                            <div key={n.id} onClick={() => navTo(n.id)} className="nav-item" style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                                fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8,
                                background: isActive ? "rgba(255,255,255,.1)" : "transparent",
                                color: isActive ? "#fff" : "rgba(255,255,255,.6)", transition: "all .15s"
                            }}>
                                {n.label}
                                {n.badge != null && (
                                    <span style={{
                                        background: n.badgeColor || T.amber,
                                        color: n.badgeColor === T.amber ? T.navy : "#fff",
                                        fontSize: 11, fontWeight: 700, fontFamily: "ui-monospace, Consolas, monospace",
                                        padding: "1px 6px", borderRadius: 4, minWidth: 20, textAlign: "center"
                                    }}>{n.badge}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── MAIN ─── */}
            <div className="print-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                {/* Topbar */}
                <div className="no-print" style={{
                    background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 24px",
                    height: 56, display: "flex", alignItems: "center", gap: 14, flexShrink: 0
                }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".01em" }}>
                            {view === "dashboard" ? "Dashboard"
                                : view === "rawmaterials" ? "Raw Materials"
                                    : view === "rm-detail" ? (state.rms.find(x => x.id === viewParams.rmId)?.name || "RM Detail")
                                        : view === "products" ? "Proforma Invoice"
                                            : view === "product-detail" ? (state.products.find(x => x.id === viewParams.pid)?.name || "Product")
                                                : view === "batch-detail" ? (() => { const p = state.products.find(x => x.id === viewParams.pid); const b = p?.batches.find(x => x.id === viewParams.bid); return b?.bid || "Batch"; })()
                                                    : view}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, fontFamily: "ui-monospace, Consolas, monospace", marginTop: 1 }}>
                            {view === "dashboard" ? "Overview & Activity"
                                : view === "rawmaterials" ? "Ingredient Library"
                                    : view === "products" ? "Select a product to generate an invoice"
                                        : view === "product-detail" ? "Formula Trials & Batches"
                                            : view === "batch-detail" ? "Editable Price Estimate"
                                                : ""}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="print-main" style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                    {view === "dashboard" && <Dashboard state={state} onNav={navTo} />}
                    {view === "rawmaterials" && <RawMaterials state={state} onNav={navTo} onAddRM={() => setShowAddRM(true)} />}
                    {view === "rm-detail" && <RMDetail state={state} rmId={viewParams.rmId}
                        onBack={() => navTo("rawmaterials")} onUpdateRM={updateRM} onDeleteRM={deleteRM} />}
                    {view === "products" && <Products state={state} onNav={navTo} onAddProduct={() => setShowAddProd(true)} />}
                    {view === "product-detail" && <ProductDetail state={state} pid={viewParams.pid}
                        onBack={() => navTo("products")}
                        onOpenBatch={(pid, bid) => navTo("batch-detail", { pid, bid })}
                        onAddBatch={addBatch}
                        onDuplicate={duplicateBatch} />}
                    {view === "batch-detail" && <BatchDetail
                        state={state} pid={viewParams.pid} bid={viewParams.bid}
                        onBack={() => navTo("product-detail", { pid: viewParams.pid })}
                        onSave={saveBatch} showToast={showToast} />}
                </div>
            </div>

            {/* Modals */}
            <AddRMModal open={showAddRM} onClose={() => setShowAddRM(false)}
                suppliers={suppliers} onSave={addRM} />
            <AddProductModal open={showAddProd} onClose={() => setShowAddProd(false)}
                onSave={addProduct} />

            {/* Toast */}
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            {/* Global fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#C8D8E4;border-radius:3px;}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{opacity:1;}
        
        /* User Friendly Button Styles */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            white-space: nowrap;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn:hover {
            transform: translateY(-1px);
        }
        .btn:active {
            transform: translateY(1px);
        }
        
        .fab-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .fab-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 14px 30px rgba(0,0,0,0.25) !important; }
        .fab-btn:active { transform: translateY(1px); }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .btn-primary { background: #18181B; color: #FFFFFF; border: 1px solid #27272A; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
        .btn-primary:hover { background: #27272A; border-color: #3F3F46; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }

        .btn-ghost { background: transparent; color: #6B7280; border: 1px solid transparent; }
        .btn-ghost:hover { background: #F3F4F6; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

        .btn-danger { background: #FFFFFF; color: #EF4444; border: 1px solid #FECACA; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .btn-danger:hover { background: #FEF2F2; color: #DC2626; border-color: #F87171; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.15); }

        .btn-success { background: #FFFFFF; color: #10B981; border: 1px solid #A7F3D0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .btn-success:hover { background: #ECFDF5; color: #059669; border-color: #34D399; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15); }
        
        .btn-sm { padding: 6px 14px; border-radius: 8px; font-size: 12px; }
        .btn-lg { padding: 9px 18px; border-radius: 8px; font-size: 13px; }

        .close-btn { transition: all 0.2s; }
        .close-btn:hover { background: #F3F4F6 !important; color: #18181B !important; }
        
        .back-btn { transition: all 0.2s; }
        .back-btn:hover { color: #18181B !important; transform: translateX(-2px); }
        
        .del-btn { transition: all 0.2s; }
        .del-btn:hover { background: #FEE2E2 !important; color: #EF4444 !important; }

        .nav-item:hover { background: rgba(245,158,11,0.08) !important; color: #fff !important; }
        
        .filter-btn:hover { border-color: #9CA3AF !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transform: translateY(-1px); }
        
        .clickable-row:hover { box-shadow: 0 4px 12px rgba(15,27,45,0.08); border-color: #9CA3AF !important; transform: translateY(-2px); }
        
        .clickable-card:hover { box-shadow: 0 6px 16px rgba(15,27,45,0.08); border-color: #9CA3AF !important; transform: translateY(-2px); }
        
        .clickable-tr:hover td { background: #F3F4F6; border-bottom-color: #E5E7EB !important; }
        
        /* Search Bar Enhancement */
        .search-input {
            transition: all 0.2s ease;
        }
        .search-input:hover {
            border-color: #9CA3AF !important;
            box-shadow: 0 2px 8px rgba(15,27,45,0.05);
        }
        .search-input:focus {
            border-color: #3B82F6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .search-input:focus + .search-icon {
            color: #3B82F6 !important;
        }

        @media print {
            .no-print, button { display: none !important; }
            body, .print-main { 
                background: white !important; 
                overflow: visible !important; 
                height: auto !important; 
            }
            .print-main { display: block !important; padding: 0 !important; }
            * { box-shadow: none !important; }
            ::-webkit-scrollbar { display: none; }
            input { 
                border: none !important; 
                background: transparent !important; 
                padding: 0 !important; 
                margin: 0 !important; 
                font-size: inherit !important;
            }
            .remarks-preview-box { 
                border: none !important; 
                background: transparent !important; 
                padding: 0 !important; 
            }
        }
      `}</style>
        </div>
    );
}
