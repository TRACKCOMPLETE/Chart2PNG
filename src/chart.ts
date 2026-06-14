/* 
  このプロジェクト専用の型定義ファイル
*/

export interface RenderNote {
    lane: number;
    start: number;
    end?: number;
}

export interface ChartData {
    columns: number;
    notes: RenderNote[];
}