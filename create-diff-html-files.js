//
// You'll need Node.js <https://nodejs.org> installed on your computer in order to run this script.
// From a terminal:
// $ cd [working directory containing this script and the associated data files]
// $ node create-diff-html-files.js
// Warning: may take about forty minutes to complete...
//
let start = new Date ();
//
const fs = require ('fs');
const path = require ('path');
//
const sources =
{
    // "UCS":
    // {
    //     // No Unihan property, extension B only
    //     source: "UCS2003",
    //     designation: "Q",
    //     modifier: "🄠"
    // },
    "G":
    {
        property: "kIRG_GSource",
        source: "China",
        designation: "G",
        modifier: "🄖"
    },
    "H":
    {
        property: "kIRG_HSource",
        source: "Hong Kong",
        designation: "H",
        modifier: "🄗"
    },
    "M":
    {
        property: "kIRG_MSource",
        source: "Macao",
        designation: "M",
        modifier: "🄜"
    },
    "T":
    {
        property: "kIRG_TSource",
        source: "Taiwan",
        designation: "T",
        modifier: "🄣"
    },
    "J":
    {
        property: "kIRG_JSource",
        source: "Japan",
        designation: "J",
        modifier: "🄙"
    },
    "K":
    {
        property: "kIRG_KSource",
        source: "South Korea",
        designation: "K",
        modifier: "🄚"
    },
    "KP":
    {
        property: "kIRG_KPSource",
        source: "North Korea",
        designation: "P",
        modifier: "🄟"
    },
    "V":
    {
        property: "kIRG_VSource",
        source: "Vietnam",
        designation: "V",
        modifier: "🄥"
    },
    "UTC":
    {
        property: "kIRG_USource",
        source: "UTC",
        designation: "U",
        modifier: "🄤"
    },
    "SAT":
    {
        property: "kIRG_SSource",
        source: "SAT",
        designation: "S",
        modifier: "🄢"
    },
    "UK":
    {
        property: "kIRG_UKSource",
        source: "U.K.",
        designation: "B",
        modifier: "🄑"
    }
};
//
const sortedPrefixes = Object.keys (sources).reverse ();
//
const sourceProperties =
[
    "kIRG_GSource",
    "kIRG_HSource",
    "kIRG_MSource",
    "kIRG_TSource",
    "kIRG_JSource",
    "kIRG_KSource",
    "kIRG_KPSource",
    "kIRG_VSource",
    "kIRG_USource",
    "kIRG_SSource",
    "kIRG_UKSource"
];
//
function toDesignation (string)
{
    let designation = "";
    for (let prefix of sortedPrefixes)
    {
        if (string.startsWith (prefix))
        {
            designation = sources[prefix].designation;
            break;
        }
    }
    return designation;
}
//
function parseSources (dataFile)
{
    const IDs = { };
    const lines = fs.readFileSync (dataFile, { encoding: 'utf8' }).split (/\r?\n/);
    for (let line of lines)
    {
        if (line && (line[0] !== "#"))
        {
            let found = line.match (/^(U\+[23]?[0-9A-F]{4})\t(\w+)\t(.+)$/);
            if (found)
            {
                if (sourceProperties.includes (found[2]))
                {
                    let character = String.fromCodePoint (parseInt (found[1].replace ("U+", ""), 16));
                    let designation = toDesignation (found[3]);
                    IDs[`${character}_${designation}`] = found[3];
                }
            }
        }
    }
    return IDs;
}
//
const IDs13 = parseSources (path.join (__dirname, 'Unihan 13.0', 'Unihan_IRGSources.txt'));
const IDs14 = parseSources (path.join (__dirname, 'Unihan 14.0', 'Unihan_IRGSources.txt'));
//
const array13 = Object.keys (IDs13);
const array14 = Object.keys (IDs14);
//
// Glyphs in 13.0 but not in 14.0 -> removed in 14.0
const removedArray = array13.filter (ID => !array14.includes (ID));
//
// Glyphs in 14.0 but not in 13.0 -> added in 14.0
const addedArray = array14.filter (ID => !array13.includes (ID));
//
// Glyphs in both 13.0 and 14.0 (but changed in 14.0 only if different shape)
const commonArray = array14.filter (ID => array13.includes (ID));
//
const pages13 = require ('./svg-pages-13.0.json');
const pages14 = require ('./svg-pages-14.0.json');
//
function getBlockRange (character, pages)
{
    let result = null;
    let value = character.codePointAt (0);
    for (let page of pages)
    {
        if ((value >= page.first) && (value <= page.last))
        {
            result = { block: page.block, range: page.range, page: page.page };
            break;
        }
    }
    return result;
}
//
let lastPath13 = "";
let svgFileString13;
//
let lastPath14 = "";
let svgFileString14;
//
function getSVG (ID, pages, dirName)
{
    let pattern = `<symbol id="${ID}" viewBox="0 0 1000 1000" data-size="\\d+">(.*?)</symbol>`;
    let [ character ] = ID;
    let { block, range } = getBlockRange (character, pages);
    let svgFilePath = path.join (__dirname, dirName, block, `${range}.svg`);
    let svg;
    switch (dirName)
    {
        case 'svg-glyphs-13.0':
            if (svgFilePath !== lastPath13)
            {
                svgFileString13 = fs.readFileSync (svgFilePath, { encoding: 'utf8' });
                lastPath13 = svgFilePath;
            }
            svg = svgFileString13.match (new RegExp (pattern, 'ui'));
            break;
        case 'svg-glyphs-14.0':
            if (svgFilePath !== lastPath14)
            {
                svgFileString14 = fs.readFileSync (svgFilePath, { encoding: 'utf8' });
                lastPath14 = svgFilePath;
            }
            svg = svgFileString14.match (new RegExp (pattern, 'ui'));
            break;
    }
    return svg ? `<svg viewBox="0 0 1000 1000">${svg[1]}</svg>` : "";
}
//
function isCompatibility (character)
{
    return /[\uF900-\uFAFF\u{2F800}-\u{2FA1F}]/u.test (character) && /\P{Unified_Ideograph}/u.test (character);
}
//
let htmlText =
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CJK {{prefix}}-source glyphs diff</title>
    <style>
        body
        {
            font-family: sans-serif;
            margin-left: 2em;
        }
        nav
        {
            font-weight: normal;
        }
        table
        {
            border-collapse: collapse;
            border: 1px solid gray;
            margin-bottom: 2em;
        }
        table tr
        {
            border: 1px solid gray;
        }
        table th,
        table td
        {
            border: 1px solid gray;
            text-align: center;
            padding: 0.5em;
        }
        table td div.code-point
        {
            font-family: monospace;
            font-size: 18px;
            width: 96px;
            line-height: 1em;
            padding: 3px 0 2px 0;
            border: 1px solid hsl(31, 5%, 88%);
            border-radius: 2px;
            background-color: hsl(31, 5%, 96%);
        }
        table td div.code-point.compatibility
        {
            font-style: italic;
        }
        table td span.glyph svg
        {
            width: 96px;
            height: 96px;
        }
        table td div.source
        {
            font-size: 13px;
        }
        table td div.source.compatibility
        {
            font-style: italic;
        }
        table th a,
        table td a
        {
            font-size: smaller;
            font-weight: normal;
        }
        table td.empty
        {
            user-select: none;
            cursor: default;
            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><g fill="hsl(0, 0%, 96%)"><polygon points="0,1 0,2 2,0 1,0" /><polygon points="1,2 2,2 2,1" /></g></svg>');
            background-size: 8px;
            background-position: center;
            color: var(--color-dimmed);
        }
    </style>
</head>
<body>
    <h2>CJK {{prefix}}-source glyphs diff</h2>
    <nav>
        <a href="#removed">Removed glyphs</a>&nbsp;&nbsp;<a href="#added">Added glyphs</a>&nbsp;&nbsp;<a href="#changed">Changed glyphs</a>
    </nav>
    {{diff}}
</body>
</html>
`;
//
for (let prefix in sources)
{
    let { designation: sourceDesignation } = sources[prefix];
    //
    let removedHtmlStrings = [ ];
    //
    let removedIDs = removedArray.filter (ID => (ID.replace (/^._/u,"") === sourceDesignation));
    if (removedIDs.length > 0)
    {
        removedHtmlStrings.push (`<h3 id="removed">Removed glyphs in Unicode 14.0:&nbsp;&nbsp;${removedIDs.length}</h3>`);
        removedHtmlStrings.push (`<table>`);
        removedHtmlStrings.push (`<tr><th>Code Point</th><th>Unicode 13.0</th><th>Unicode 14.0</th></tr>`);
        for (let removedID of removedIDs)
        {
            let [ character ] = removedID;
            let codePoint = `U+${character.codePointAt (0).toString (16).toUpperCase ()}`;
            let compatibility = isCompatibility (character) ? " compatibility" : "";
            removedHtmlStrings.push (`<tr><td><div class="code-point${compatibility}">${codePoint}</div></td><td><span class="glyph">${getSVG (removedID, pages13, 'svg-glyphs-13.0')}</span><br><div class="source${compatibility}">${IDs13[removedID]}</div></td><td class="empty"></td></tr>`);
        }
        removedHtmlStrings.push (`</table>`);
    }
    //
    let addedHtmlStrings = [ ];
    //
    let addedIDs = addedArray.filter (ID => (ID.replace (/^._/u,"") === sourceDesignation));
    if (addedIDs.length > 0)
    {
        addedHtmlStrings.push (`<h3 id="added">Added glyphs in Unicode 14.0:&nbsp;&nbsp;${addedIDs.length}</h3>`);
        addedHtmlStrings.push (`<table>`);
        addedHtmlStrings.push (`<tr><th>Code Point</th><th>Unicode 13.0</th><th>Unicode 14.0</th></tr>`);
        for (let addedID of addedIDs)
        {
            let [ character ] = addedID;
            let codePoint = `U+${character.codePointAt (0).toString (16).toUpperCase ()}`;
            let compatibility = isCompatibility (character) ? " compatibility" : "";
            addedHtmlStrings.push (`<tr><td><div class="code-point${compatibility}">${codePoint}</div></td><td class="empty"></td><td><span class="glyph">${getSVG (addedID, pages14, 'svg-glyphs-14.0')}</span><br><div class="source${compatibility}">${IDs14[addedID]}</div></td></tr>`);
        }
        addedHtmlStrings.push (`</table>`);
    }
    //
    let changedHtmlStrings = [ ];
    //
    let changedIDs = [ ];
    let commonIDs = commonArray.filter (ID => (ID.replace (/^._/u,"") === sourceDesignation));
    if (commonIDs.length > 0)
    {
        changedHtmlStrings.push (`<table>`);
        changedHtmlStrings.push (`<tr><th>Code Point</th><th>Unicode 13.0</th><th>Unicode 14.0</th></tr>`);
        for (let commonID of commonIDs)
        {
            let svg13 = getSVG (commonID, pages13, 'svg-glyphs-13.0');
            let svg14 = getSVG (commonID, pages14, 'svg-glyphs-14.0');
            if (svg13 !== svg14)
            {
                changedIDs.push (commonID);
                let [ character ] = commonID;
                let codePoint = `U+${character.codePointAt (0).toString (16).toUpperCase ()}`;
                let compatibility = isCompatibility (character) ? " compatibility" : "";
                changedHtmlStrings.push (`<tr><td><div class="code-point${compatibility}">${codePoint}</div></td><td><span class="glyph">${svg13}</span><br><div class="source${compatibility}">${IDs13[commonID]}</div></td><td><span class="glyph">${svg14}</span><br><div class="source${compatibility}">${IDs14[commonID]}</div></td></tr>`);
            }
        }
        changedHtmlStrings.push (`</table>`);
        changedHtmlStrings.unshift (`<h3 id="changed">Changed glyphs in Unicode 14.0:&nbsp;&nbsp;${changedIDs.length}&nbsp;/&nbsp;${commonIDs.length}</h3>`);
    }
    if (changedIDs.length === 0)
    {
        changedHtmlStrings = [ ];
    }
    //
    if ((removedIDs.length + addedIDs.length + changedIDs.length) > 0)
    {
        fs.writeFileSync (path.join (__dirname, `CJK ${prefix}-source glyphs diff.html`), htmlText.replace (/\{\{prefix\}\}/g, prefix).replace (/\{\{diff\}\}/g, removedHtmlStrings.join ("") + addedHtmlStrings.join ("") + changedHtmlStrings.join ("")));
    }
}
//
let stop = new Date ();
console.log (`Processed in ${((stop - start) / 1000).toFixed (2)} seconds`);
//
