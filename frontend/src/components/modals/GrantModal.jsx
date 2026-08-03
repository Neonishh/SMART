export default function GrantModal({ grant, onClose }) {

    if (!grant) return null;

    return (

        <div
            className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center"
            onClick={onClose}
        >

            <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex flex-col w-[850px] max-w-[92vw] h-[75vh] bg-white rounded-2xl border border-slate-300 shadow-[0_30px_60px_rgba(0,0,0,0.35)] overflow-hidden"
            >

                {/* ================= HEADER ================= */}

                <div className="flex justify-between items-center border-b bg-white px-6 py-4 flex-shrink-0">

                    <div>

                        <h2 className="text-xl font-bold text-gray-900">

                            Grant Details

                        </h2>

                        <p className="text-gray-500 text-sm">

                            SMART Knowledge Graph

                        </p>

                    </div>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100 text-2xl transition"
                    >

                        ×

                    </button>

                </div>

                {/* ================= BODY ================= */}

                <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5">

                    {/* TITLE */}

                    <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl p-5 shadow-sm mb-5">

                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">

                            Grant Title

                        </p>

                        <h3 className="text-xl font-bold leading-relaxed text-gray-900">

                            {grant.Title}

                        </h3>

                    </div>

                    {/* GRID */}

                    <div className="grid md:grid-cols-2 gap-4 mb-5">

                        <InfoCard

                            label="Principal Investigator"

                            value={grant.Principal_Investigator}

                        />

                        <InfoCard

                            label="Institution"

                            value={grant.Institution}

                        />

                        <InfoCard

                            label="Funding Agency"

                            value={grant.Funding_Agency}

                        />

                        <InfoCard

                            label="Department"

                            value={grant.Department}

                        />

                        <InfoCard

                            label="Funding Amount"

                            value={
                                grant.Amount
                                    ? `₹${Number(grant.Amount).toLocaleString()}`
                                    : "-"
                            }

                        />

                        <InfoCard

                            label="Year"

                            value={grant.Year}

                        />

                    </div>

                    {/* SOURCE */}

                    <div className="bg-white border rounded-xl shadow-sm p-5 mb-5">

                        <h3 className="font-semibold text-lg mb-3">

                            Source

                        </h3>

                        {grant.Source_URL ? (

                            <a

                                href={grant.Source_URL}

                                target="_blank"

                                rel="noreferrer"

                                className="text-blue-600 hover:underline break-all"

                            >

                                {grant.Source_URL}

                            </a>

                        ) : (

                            <p className="text-gray-500">

                                No source URL available.

                            </p>

                        )}

                    </div>

                    {/* RELATED OUTPUTS */}

                    <div className="grid md:grid-cols-2 gap-5">

                        <div className="bg-white border rounded-xl shadow-sm p-5">

                            <h3 className="font-semibold text-lg mb-3">

                                Related Publications

                            </h3>

                            {grant.Publications?.length ? (

                                <ul className="list-disc ml-5 space-y-2">

                                    {grant.Publications.map((item) => (

                                        <li key={item}>

                                            {item}

                                        </li>

                                    ))}

                                </ul>

                            ) : (

                                <p className="text-gray-500">

                                    No linked publications.

                                </p>

                            )}

                        </div>

                        <div className="bg-white border rounded-xl shadow-sm p-5">

                            <h3 className="font-semibold text-lg mb-3">

                                Patent Outcomes

                            </h3>

                            {grant.Patents?.length ? (

                                <ul className="list-disc ml-5 space-y-2">

                                    {grant.Patents.map((item) => (

                                        <li key={item}>

                                            {item}

                                        </li>

                                    ))}

                                </ul>

                            ) : (

                                <p className="text-gray-500">

                                    No linked patents.

                                </p>

                            )}

                        </div>

                    </div>

                </div>

                {/* ================= FOOTER ================= */}

                <div className="border-t bg-white px-6 py-4 flex justify-end flex-shrink-0">

                    <button

                        onClick={onClose}

                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-7 py-2 transition"

                    >

                        Close

                    </button>

                </div>

            </div>

        </div>

    );

}

/* =====================================================
   HELPER CARD
===================================================== */

function InfoCard({ label, value }) {

    return (

        <div className="bg-white border rounded-xl shadow-sm p-4">

            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">

                {label}

            </p>

            <p className="font-semibold text-gray-900 break-words">

                {value || "-"}

            </p>

        </div>

    );

}