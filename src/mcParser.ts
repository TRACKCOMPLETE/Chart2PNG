import type { ChartData, RenderNote } from "./chart";

function beatToNumber(
    beat: [number, number, number]
): number {
    return beat[0] + beat[1] / beat[2];
}

export function parseMc(text: string): ChartData {
    const json = JSON.parse(text);

    const notes: RenderNote[] = [];

    for (const note of json.note) {
        if (typeof note.column !== "number") {
            continue;
        }

        const parsed: RenderNote = {
            lane: note.column,
            start: beatToNumber(note.beat),
        };

        if (note.endbeat) {
            parsed.end = beatToNumber(note.endbeat);
        }

        notes.push(parsed);
    }

    return {
        columns: json.meta.mode_ext.column,
        notes,
    };
}