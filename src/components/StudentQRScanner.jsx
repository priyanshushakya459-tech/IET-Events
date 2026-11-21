
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabaseClient";
import "./StudentQRScanner.css";

function StudentQRScanner({ onClose }) {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  const [message, setMessage] = useState("Starting camera...");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("student-qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (processingRef.current) return;

            processingRef.current = true;

            try {
              setStatus("loading");
              setMessage("QR detected. Verifying attendance...");

              await scanner.stop();

              // Parse QR code
              let payload;

              try {
                payload = JSON.parse(decodedText);
              } catch {
                throw new Error("Invalid QR code format.");
              }

              if (!payload.session_id || !payload.token) {
                throw new Error("Invalid attendance QR code.");
              }

              // Check student login
              const {
                data: { session },
                error: authError,
              } = await supabase.auth.getSession();

              if (authError) throw authError;

              if (!session?.access_token) {
                throw new Error("Please login again.");
              }

              // Verify attendance using deployed Edge Function
              const { data, error } =
                await supabase.functions.invoke(
                  "bright-function",
                  {
                    body: {
                      session_id: payload.session_id,
                      token: payload.token,
                    },
                  }
                );

              if (error) {
                let details = error.message;

                try {
                  const response = await error.context?.json();

                  details =
                    response?.error ||
                    response?.message ||
                    details;
                } catch {
                  // Keep original error message
                }

                throw new Error(details);
              }

              if (!data?.success) {
                throw new Error(
                  data?.error ||
                  data?.message ||
                  "Attendance verification failed."
                );
              }

              if (!mountedRef.current) return;

              setStatus("success");
              setMessage(
                data.message ||
                "Attendance marked successfully!"
              );

              console.log(
                "Attendance successful:",
                data.attendance
              );

            } catch (err) {
              if (!mountedRef.current) return;

              console.error("QR attendance error:", err);

              setStatus("error");
              setMessage(
                err.message ||
                "Unable to mark attendance."
              );

              processingRef.current = false;
            }
          },
          () => {
            // Ignore normal QR scanning frame errors
          }
        );

        if (mountedRef.current) {
          setStatus("scanning");
          setMessage(
            "Scan the QR code displayed by the organizer."
          );
        } else if (scanner.isScanning) {
          await scanner.stop();
        }

      } catch (err) {
        console.error("Camera error:", err);

        if (mountedRef.current) {
          setStatus("error");
          setMessage(
            err.message ||
            "Unable to access camera. Please allow camera permission."
          );
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;

      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .catch((err) =>
            console.error("Scanner cleanup:", err)
          );
      }
    };
  }, []);

  return (
    <div className="student-scanner-overlay">
      <div className="student-scanner-modal">

        {/* Header */}
        <div className="student-scanner-header">
          <div>
            <span>IET EVENTS</span>
            <h2>Scan Attendance QR</h2>
          </div>

          <button
            className="student-scanner-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Camera */}
        <div className="student-scanner-camera">
          <div id="student-qr-reader"></div>
        </div>

        {/* Status Message */}
        <div
          className={`student-scanner-message ${status}`}
        >
          {status === "success"
            ? "✓"
            : status === "error"
            ? "!"
            : "📷"}

          {" "}

          {message}
        </div>

        {/* Success */}
        {status === "success" && (
          <button
            className="student-scanner-done"
            onClick={onClose}
          >
            Done
          </button>
        )}

        {/* Error */}
        {status === "error" && (
          <button
            className="student-scanner-done"
            onClick={onClose}
          >
            Close
          </button>
        )}

        {/* Scanning Hint */}
        {status !== "success" &&
          status !== "error" && (
            <p className="student-scanner-hint">
              Keep your camera pointed at the organizer's QR code.
            </p>
          )}

      </div>
    </div>
  );
}

export default StudentQRScanner;
