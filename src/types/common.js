/**
 * @typedef {string} PlayerId
 * @typedef {string} MatchId
 * @typedef {string} RoomId
 *
 * @typedef {Object} Tile
 * @property {string} letter - Uppercase TR letter or '*'
 * @property {boolean} [isBlank] - True if joker
 * @property {string|null} [repr] - If blank, represented letter (uppercase TR)
 * @property {number} [value] - Tile score value
 * @property {string|undefined} [id] - Optional unique id for per-tile tracking
 *
 * @typedef {Object} BoardCell
 * @property {string|null} letter
 * @property {boolean} [isBlank]
 * @property {string|null} [blankAs]
 * @property {('DL'|'TL'|'DW'|'TW'|null)} [multiplier]
 * @property {boolean} [usedMultipliers]
 * @property {boolean} [isCenter]
 * @property {PlayerId|null} [owner]
 *
 * @typedef {Object} MoveTile
 * @property {number} row
 * @property {number} col
 * @property {string} letter
 * @property {boolean} [isBlank]
 * @property {string} [repr]
 *
 * @typedef {Object} MovePayload
 * @property {'place_tiles'} type
 * @property {Array<MoveTile>} tiles
 * @property {{moveId:string, words:string[], validatedWords?:Array<{word:string,positions:Array<{row:number,col:number}>}>}} meta
 */

// This file declares shared JSDoc typedefs for editor intellisense.
// no-op export to make this a module in bundlers that require it
export const __types = true;
