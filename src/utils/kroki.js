import pako from 'pako';

const KROKI_BASE = 'https://kroki.io';

/**
 * Render a diagram using the Kroki POST API.
 * Returns an SVG string or image blob URL depending on format.
 */
export async function renderWithKroki(source, diagramType, outputFormat = 'svg') {
    const url = `${KROKI_BASE}/${diagramType}/${outputFormat}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: source,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kroki error (${response.status}): ${errorText}`);
    }

    if (outputFormat === 'svg') {
        return await response.text();
    } else {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
}

/**
 * Encode diagram to a URL-safe deflate+base64 string for Kroki GET requests.
 */
export function encodeForKroki(source) {
    const data = new TextEncoder().encode(source);
    const compressed = pako.deflate(data, { level: 9 });
    const base64 = btoa(String.fromCharCode(...compressed));
    return base64.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Get a shareable Kroki URL.
 */
export function getKrokiUrl(source, diagramType, outputFormat = 'svg') {
    const encoded = encodeForKroki(source);
    return `${KROKI_BASE}/${diagramType}/${outputFormat}/${encoded}`;
}

/**
 * Map of diagram types to their Kroki identifiers and display names.
 */
export const DIAGRAM_TYPES = {
    plantuml: { label: 'PlantUML', defaultCode: '@startuml\n\nclass User {\n  +name: String\n  +email: String\n  +login()\n  +logout()\n}\n\nclass Diagram {\n  +title: String\n  +code: String\n  +render()\n  +save()\n}\n\nUser "1" --> "*" Diagram : creates\n\n@enduml' },
    mermaid: { label: 'Mermaid', defaultCode: 'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Process A]\n  B -->|No| D[Process B]\n  C --> E[End]\n  D --> E' },
    actdiag: { label: 'Activity Diagram', defaultCode: 'actdiag {\n  login -> check_credentials -> authorize\n  authorize -> show_dashboard\n  authorize -> show_error\n}' },
    seqdiag: { label: 'Sequence Diagram', defaultCode: 'seqdiag {\n  browser -> webserver [label = "GET /index.html"];\n  browser <-- webserver;\n  browser -> webserver [label = "POST /api/data"];\n  browser <-- webserver;\n}' },
    erd: { label: 'ER Diagram', defaultCode: '[Person]\n*name\nheight\nweight\n+birth_location_id\n\n[Location]\n*id\ncity\nstate\ncountry\n\nPerson *--1 Location' },
    ditaa: { label: 'Ditaa', defaultCode: '+--------+   +--------+   +--------+\n|  User  |-->| Server |-->|  DB    |\n|        |   |        |   |        |\n+--------+   +--------+   +--------+' },
    nwdiag: { label: 'Network Diagram', defaultCode: 'nwdiag {\n  network dmz {\n    address = "210.x.x.x/24"\n    web01 [address = "210.x.x.1"];\n    web02 [address = "210.x.x.2"];\n  }\n  network internal {\n    address = "172.x.x.x/24";\n    web01 [address = "172.x.x.1"];\n    db01;\n  }\n}' },
};
