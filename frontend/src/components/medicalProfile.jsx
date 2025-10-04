import React from "react";

// Small inline SVG icons – no external deps
const HeartIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="conditions">
        <path
            d="M12 21s-6.716-4.31-9.333-7.06C.5 11.69.5 8.5 2.3 6.7a4.5 4.5 0 0 1 6.364 0L12 10.036l3.336-3.336a4.5 4.5 0 1 1 6.364 6.364C18.716 16.69 12 21 12 21z"
            fill="#ff7aa2"
        />
    </svg>
);

const PillIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="medications">
        <rect x="3" y="8" width="18" height="8" rx="4" fill="#ffd24d" />
        <rect x="3" y="8" width="9" height="8" rx="4" fill="#fff2b3" />
    </svg>
);

const WarningIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="allergies">
        <path d="M12 2l10 18H2L12 2z" fill="#ffc04d" />
        <rect x="11" y="9" width="2" height="6" rx="1" fill="#3b2d00" />
        <rect x="11" y="16.5" width="2" height="2" rx="1" fill="#3b2d00" />
    </svg>
);

function Row({ icon, children }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "6px 0",
        }}>
            <div aria-hidden style={{ width: 22, height: 22, display: "grid", placeItems: "center" }}>
                {icon}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.4 }}>{children}</div>
        </div>
    );
}

export function MedicalProfileCard({
                                       name = "John Smith",
                                       age = 42,
                                       conditions = ["Type 2 Diabetes", "Hypertension"],
                                       medications = ["Metformin", "Lisinopril"],
                                       allergies = ["Penicillin"],
                                   }) {
    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div style={styles.avatar} aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" fill="#dbeafe" />
                        <path d="M4 20c.9-3.5 4.5-6 8-6s7.1 2.5 8 6" fill="#bfdbfe" />
                    </svg>
                </div>
                <div style={styles.subtitle}>{`${name}, Age ${age}`}</div>
            </div>

            <div style={{ marginTop: 8 }}>
                <Row icon={<HeartIcon />}>{conditions.join(", ")}</Row>
                <Row icon={<PillIcon />}>{medications.join(", ")}</Row>
                <Row icon={<WarningIcon />}>{`Allergic to ${allergies.join(", ")}`}</Row>
            </div>
        </div>
    );
}

const styles = {
    card: {
        color: "#fff",
        borderRadius: 16,
        padding: 18,
        background: "linear-gradient(135deg, #1f3b9c 0%, #1845b0 60%, #1556cf 100%)",
        boxShadow:
            "0 10px 25px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    header: {
        display: "flex",
        gap: 12,
        alignItems: "center",
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 999,
        background: "rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
    },
    subtitle: {
        marginTop: 2,
        fontSize: 14,
        color: "#c7d2fe",
    },
};

// Demo wrapper for the canvas preview. In your app, import and use <MedicalProfileCard /> directly.
export default function Demo() {
    return (
        <MedicalProfileCard />
    );
}