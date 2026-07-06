interface LineSegment {
    color: number;
}

interface HorizontalLine extends LineSegment {
    r: number;
    c1: number;
    c2: number;
}

interface VerticalLine extends LineSegment {
    c: number;
    r1: number;
    r2: number;
}

/**
 * Transforms dot coordinates into line definitions.
 * 
 * @param {Record<number, [number, number][]>} dots - Map of colors to their respective coordinate points.
 * @returns {{ hLines: HorizontalLine[], vLines: VerticalLine[] }} Object containing categorized line segments.
 */
function extractLines(dots: Record<number, [number, number][]>): { hLines: HorizontalLine[], vLines: VerticalLine[] } {
    const hLines: HorizontalLine[] = [];
    const vLines: VerticalLine[] = [];
    
    for (const colorStr in dots) {
        const color = parseInt(colorStr);
        const [p1, p2] = dots[colorStr];
        
        if (p1[0] === p2[0]) {
            hLines.push({ 
                r: p1[0], 
                c1: Math.min(p1[1], p2[1]), 
                c2: Math.max(p1[1], p2[1]), 
                color 
            });
        } else {
            vLines.push({ 
                c: p1[1], 
                r1: Math.min(p1[0], p2[0]), 
                r2: Math.max(p1[0], p2[0]), 
                color 
            });
        }
    }
    return { hLines, vLines };
}