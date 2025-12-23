
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/field/new/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The marker for the start of the return block
// We look for "return (" followed by specific lines we saw in view_file (lines 1900+)
// 1900:     return (
// 1901:         <>
// 1902:             <div
const startMarker = `    return (
        <>
            <div
                style={{
                    position: "fixed",`;

// The marker for the end of the return block
// 2689:     );
// 2690: }
// 2692: // ----------------------------------------------------------------------
const endMarker = `    );
}

// ----------------------------------------------------------------------`;

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error("Start marker not found!");
    process.exit(1);
}

// Find the end helper which is definitely after the return block
const endHelper = "// ----------------------------------------------------------------------\n// Helper for AR Params";
const endIndex = content.indexOf(endHelper, startIndex);

if (endIndex === -1) {
    console.error("End marker (AR Helper) not found!");
    process.exit(1);
}

// We want to replace from startIndex up to endIndex BUT we need to keep the closing brace of the component.
// The component closes at line 2690: "}"
// The "endHelper" starts at line 2692.
// So between the return block and endHelper there is "}" and blank lines.
// We will replace everything from `startIndex` to `endIndex` with our new return block AND the closing brace.

const newUI = `    return (
        <div style={{ paddingBottom: 120, minHeight: "100vh", background: "#f3f4f6" }}>
            {/* Step Progress Header */}
            <header style={{ 
                position: "sticky", top: 0, zIndex: 100, background: "#fff", 
                borderBottom: "1px solid #e5e7eb", padding: "16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)" 
            }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>
                   STEP {currentStep} <span style={{color:"#999", fontSize: 14}}>/ 5</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                        <div key={s} style={{ 
                            width: 8, height: 8, borderRadius: "50%", 
                            background: s === currentStep ? "#3b82f6" : s < currentStep ? "#93c5fd" : "#e5e7eb" 
                        }} />
                    ))}
                </div>
                <a href="/admin" style={{ fontSize: 20, textDecoration: "none" }}>⚙️</a>
            </header>

            {/* Sticky Summary */}
            <div style={{ background: "#1f2937", color: "#fff", padding: "10px 16px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📋 {customerName || "고객명 미입력"} / {category} {quantity}조</span>
                <span>{confirmedWidth ? confirmedWidth + "x" + confirmedHeight : "사이즈 대기"}</span>
            </div>

            <main className={styles.container} style={{ marginTop: 20 }}>
                {/* Step Content */}
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
            </main>

            {/* Bottom Navigation */}
            <div style={{ 
                position: "fixed", bottom: 0, left: 0, right: 0, 
                background: "#fff", borderTop: "1px solid #eee", padding: "16px",
                display: "flex", gap: 12, justifyContent: "space-between", zIndex: 200,
                boxShadow: "0 -4px 10px rgba(0,0,0,0.05)"
            }}>
                <button 
                    disabled={currentStep === 1} 
                    onClick={goPrev}
                    style={{ 
                        flex: 1, height: 48, borderRadius: 12, border: "1px solid #ddd", 
                        background: currentStep === 1 ? "#f5f5f5" : "#fff", 
                        color: "#333", fontWeight: "bold", opacity: currentStep === 1 ? 0.5 : 1 
                    }}
                >
                    이전
                </button>
                {currentStep < 5 ? (
                    <button 
                         onClick={goNext}
                         style={{ 
                             flex: 2, height: 48, borderRadius: 12, border: "none", 
                             background: "#2563eb", color: "#fff", fontWeight: "bold", fontSize: 16
                         }}
                    >
                         다음 단계 ({currentStep}/5)
                    </button>
                ) : (
                    <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 12 }}>
                        위의 전송 버튼을 이용하세요
                    </div>
                )}
            </div>
            
            {/* Debug Banner */}
            <div style={{ position: "fixed", bottom: 80, right: 8, pointerEvents: "none", opacity: 0.5, fontSize: 10 }}>v2.0 STEP UX</div>
        </div>
    );
}

`;

// Perform replacement
const finalContent = content.substring(0, startIndex) + newUI + content.substring(endIndex);

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("Successfully replaced UI block.");
