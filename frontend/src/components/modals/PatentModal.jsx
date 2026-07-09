export default function PatentModal({ patent, onClose }) {
        console.log("NEW MODAL LOADED");

  if (!patent) return null;

  return (
    <div
  onClick={onClose}
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
    padding: 24,
  }}
>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-[900px] max-w-[92vw] h-[78vh] bg-white rounded-2xl border-2 border-slate-300 shadow-[0_30px_60px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        {/* ================= HEADER ================= */}

        <div className="flex justify-between items-center border-b bg-white px-6 py-4 flex-shrink-0">

          <div>

            <h2 className="text-[15px] font-semibold text-gray-900">

              Patent Details

            </h2>

            

          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100 transition text-2xl"
          >
            ×
          </button>


        </div>

        {/* ================= BODY ================= */}

        <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50 px-8 py-6">

          {/* PATENT TITLE */}

          <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl shadow-sm p-6 mb-6">

            <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">

              Patent Title

            </p>

            <h3 className="text-xl font-bold text-gray-900 leading-relaxed">

              {patent.Patent_Title}

            </h3>

          </div>

          {/* INFORMATION GRID */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <InfoCard
              label="Applicant"
              value={patent.Applicant}
            />

            <InfoCard
              label="Institution"
              value={patent.Institution}
            />

            <InfoCard
              label="IPC Code"
              value={patent.IPC}
            />

            <InfoCard
              label="Research Field"
              value={patent.Field}
            />

            <InfoCard
              label="Filing Year"
              value={patent.Year}
            />

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">

              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">

                Status

              </p>

              <span className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">

                {patent.Patent_Status || "Published"}

              </span>

            </div>

          </div>

          {/* INVENTORS */}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">

            <h3 className="text-xl font-semibold mb-4">

              Inventors

            </h3>

            {patent.Inventors?.length ? (

              <div className="max-h-32 overflow-y-auto pr-3">

                <ul className="list-disc ml-6 space-y-1">

                  {patent.Inventors.map((inventor) => (

                    <li key={inventor}>

                      {inventor}

                    </li>

                  ))}

                </ul>

              </div>

            ) : (

              <p className="text-gray-500">

                No inventor information available.

              </p>

            )}

          </div>

          {/* ABSTRACT */}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">

            <h3 className="text-lg font-semibold mb-4">

              Abstract

            </h3>

            <div className="max-h-40 overflow-y-auto pr-3">

              <p className="text-gray-700 leading-6 text-[15px] whitespace-pre-line">

                {patent.Abstract || "No abstract available."}

              </p>

            </div>

          </div>

        </div>

        {/* ================= FOOTER ================= */}

        <div className="flex justify-end border-t bg-white px-6 py-3 flex-shrink-0">

          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold rounded-lg px-6 py-2 text-sm shadow"
          >

            Close

          </button>

        </div>

      </div>

    </div>
  );
}

/* ================= Helper Component ================= */

function InfoCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 hover:shadow-md transition">

      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">

        {label}

      </p>

      <p className="text-[15px] font-semibold text-gray-900 break-words">

        {value || "-"}

      </p>

    </div>
  );
}
