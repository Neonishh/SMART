// ==========================================================
// SMART Graph Details Panel
// ==========================================================

function formatValue(value) {

    if (value === null || value === undefined) {

        return "-";

    }

    // Neo4j Integer
    if (

        typeof value === "object" &&
        value.low !== undefined &&
        value.high !== undefined

    ) {

        return value.low;

    }

    return String(value);

}

export default function GraphDetails({

    selectedNode

}) {

    if (!selectedNode) {

        return (

            <div className="kg-sidebar">

                <h2>

                    Node details

                </h2>

                <p>

                    Click any node in the graph to inspect it.

                </p>

            </div>

        );

    }

    const {

        label,
        name,
        type,
        properties = {}

    } = selectedNode;

    const displayLabel = label || name || properties.title || "Unnamed node";

    return (

        <div className="kg-sidebar">

            <h2>

                {displayLabel}

            </h2>

            <hr />

            <div className="kg-property">

                <span className="kg-label">

                    Type

                </span>

                <span className="kg-value">

                    {type || "-"}

                </span>

            </div>

            <div className="kg-property">

                <span className="kg-label">

                    ID

                </span>

                <span className="kg-value kg-value-mono">

                    {formatValue(properties.id ?? selectedNode.id)}

                </span>

            </div>

            {

                properties.year != null &&

                <div className="kg-property">

                    <span className="kg-label">

                        Year

                    </span>

                    <span className="kg-value">

                        {formatValue(properties.year)}

                    </span>

                </div>

            }

            {

                properties.title &&

                <div className="kg-property">

                    <span className="kg-label">

                        Title

                    </span>

                    <span className="kg-value">

                        {formatValue(properties.title)}

                    </span>

                </div>

            }

            <hr />


        </div>

    );

}