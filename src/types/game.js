/**
 * @typedef {string} PlayerId
 * @typedef {string} MatchId
 * @typedef {string} RoomId
 *
 * @typedef {Object} BoardCell
 * @property {string|null} letter
 * @property {boolean} [isBlank]
 * @property {string|null} [blankAs]
 * @property {string|null} [multiplier] - 'DL'|'TL'|'DW'|'TW'|null
 * @property {boolean} [isCenter]
 * @property {string|null} [owner] - 'player'|'opponent'|null
 * @property {boolean} [usedMultipliers]
 *
 * @typedef {Object} Tile
 * @property {string} letter
 * @property {number} row
 * @property {number} col
 * @property {boolean} [isBlank]
 * @property {string} [repr]
 * @property {string} [id]
 *
 * @typedef {Object} MovePayload
 * @property {Array<{row:number,col:number,letter:string,isBlank:boolean,repr?:string}>} tiles
 * @property {Object} [meta]
 */
export {};