
const fs = require('fs');
const path = require('path');
const tsConfig = require('../../tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

// tsconfig-pathsの登録
const baseUrl = path.join(__dirname, '../../'); // プロジェクトルート
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths
});

import { smartLayoutAsync, calculateFitnessDetails, LayoutOptions, hierarchicalLayout } from '@/utils/autoLayout';
import { EquipmentObject, Wire } from '@/types';

const projectDataPath = path.join(__dirname, '../../新規プロジェクト(13).json');

// スコアを表示する関数
function printScoreDetails(
  label: string,
  details: ReturnType<typeof calculateFitnessDetails>,
  targetDetails?: ReturnType<typeof calculateFitnessDetails>
) {
  console.log(`\n=== ${label} ===`);
  console.log(`総合スコア: ${details.totalScore.toFixed(1)}`);
  console.log(`  接続長: ${Math.round(details.connectionLength.total)}px (ペナルティ: ${Math.round(details.connectionLength.penalty)})`);
  console.log(`  重複: ${details.overlaps.count}箇所 (ペナルティ: ${Math.round(details.overlaps.penalty)})`);
  console.log(`  配線交差: ${details.wireCrossings.count}箇所 (ペナルティ: ${Math.round(details.wireCrossings.penalty)})`);
  console.log(`  機材交差: ${details.wireEquipmentIntersections.count}箇所 (ペナルティ: ${Math.round(details.wireEquipmentIntersections.penalty)})`);
  console.log(`  ポート配置: ${details.portAlignment.satisfied}/${details.portAlignment.total} (ボーナス: ${Math.round(details.portAlignment.bonus)})`);
  console.log(`  近すぎる接続: ${details.tooCloseConnections.count}箇所 (ペナルティ: ${Math.round(details.tooCloseConnections.totalPenalty)})`);
  
  if (targetDetails) {
    console.log(`\n目標値との比較:`);
    const scoreDiff = details.totalScore - targetDetails.totalScore;
    console.log(`  総合スコア: ${details.totalScore.toFixed(1)} / 目標 ${targetDetails.totalScore.toFixed(1)} (差: ${scoreDiff > 0 ? '+' : ''}${scoreDiff.toFixed(1)})`);
    console.log(`  接続長: ${Math.round(details.connectionLength.total)}px / 目標 ${Math.round(targetDetails.connectionLength.total)}px (差: ${Math.round(details.connectionLength.total - targetDetails.connectionLength.total)}px)`);
    console.log(`  重複: ${details.overlaps.count}箇所 / 目標 ${targetDetails.overlaps.count}箇所`);
    console.log(`  配線交差: ${details.wireCrossings.count}箇所 / 目標 ${targetDetails.wireCrossings.count}箇所 (差: ${details.wireCrossings.count - targetDetails.wireCrossings.count})`);
    console.log(`  機材交差: ${details.wireEquipmentIntersections.count}箇所 / 目標 ${targetDetails.wireEquipmentIntersections.count}箇所`);
    console.log(`  ポート配置: ${details.portAlignment.satisfied}/${details.portAlignment.total} / 目標 ${targetDetails.portAlignment.satisfied}/${targetDetails.portAlignment.total}`);
    console.log(`  近すぎる接続: ${details.tooCloseConnections.count}箇所 / 目標 ${targetDetails.tooCloseConnections.count}箇所`);
  }
}

async function runTest() {
  try {
    console.log('データを読み込んでいます...');
    const projectDataRaw = fs.readFileSync(projectDataPath, 'utf8');
    const projectData = JSON.parse(projectDataRaw);

    const objects: EquipmentObject[] = projectData.objects;
    const wires: Wire[] = projectData.wires || [];

    console.log(`オブジェクト数: ${objects.length}`);
    console.log(`ワイヤー数: ${wires.length}`);

    // 目標値（手動レイアウトの結果）
    const targetScore = 102606.7;
    const targetConnectionLength = 13809;
    const targetCrossings = 10;
    const targetOverlaps = 0;
    const targetEquipmentIntersections = 0;
    const targetPortAlignment = { satisfied: 56, total: 61 };
    const targetTooClose = 0;

    console.log(`\n目標値（手動レイアウト）:`);
    console.log(`  総合スコア: ${targetScore}`);
    console.log(`  接続長: ${targetConnectionLength}px`);
    console.log(`  重複: ${targetOverlaps}箇所`);
    console.log(`  配線交差: ${targetCrossings}箇所`);
    console.log(`  機材交差: ${targetEquipmentIntersections}箇所`);
    console.log(`  ポート配置: ${targetPortAlignment.satisfied}/${targetPortAlignment.total}`);
    console.log(`  近すぎる接続: ${targetTooClose}箇所`);

    // 初期状態のスコア
    const initialPositions = objects.reduce((acc, obj) => {
      acc[obj.id] = obj.position;
      return acc;
    }, {} as Record<string, { x: number; y: number }>);

    const options: LayoutOptions = {
      algorithm: 'smart',
      spacing: 100,
      padding: 50,
      minimizeCrossings: true,
      avoidNodeOverlap: true
    };

    let initialDetails: ReturnType<typeof calculateFitnessDetails>;
    try {
      initialDetails = calculateFitnessDetails(initialPositions, objects, wires, options);
      printScoreDetails('初期状態', initialDetails);
    } catch (e) {
      console.warn('初期状態の計算に失敗しました:', e);
      return;
    }

    // 目標値の詳細（手動で構築）
    const targetDetails: ReturnType<typeof calculateFitnessDetails> = {
      totalScore: targetScore,
      connectionLength: {
        total: targetConnectionLength,
        penalty: targetConnectionLength * 0.5
      },
      overlaps: {
        count: targetOverlaps,
        totalOverlap: 0,
        penalty: 0
      },
      wireCrossings: {
        count: targetCrossings,
        penalty: targetCrossings * 300
      },
      wireEquipmentIntersections: {
        count: targetEquipmentIntersections,
        penalty: targetEquipmentIntersections * 1000
      },
      portAlignment: {
        satisfied: targetPortAlignment.satisfied,
        total: targetPortAlignment.total,
        bonus: targetPortAlignment.satisfied * 2000
      },
      tooCloseConnections: {
        count: targetTooClose,
        totalPenalty: 0
      },
      alignment: {
        bonus: 0
      },
      boundingBox: {
        area: 0,
        bonus: 0
      },
      directionality: {
        bonus: 0
      }
    };

    // プログレス表示用コールバック
    const onProgress = (progress: any) => {
      process.stdout.write(`\r進行状況: ${progress.stage || ''} ${Math.round(progress.progress || 0)}%`);
    };

    console.log('\nレイアウト計算を開始します...');
    const startTime = Date.now();
    
    // 初期配置後のスコアを確認
    const hierarchicalResult = hierarchicalLayout(objects, wires, { ...options, direction: 'horizontal' });
    const initialLayoutDetails = calculateFitnessDetails(hierarchicalResult.positions, objects, wires, options);
    printScoreDetails('初期配置後', initialLayoutDetails, targetDetails);
    
    const result = await smartLayoutAsync(objects, wires, options, onProgress);
    
    const endTime = Date.now();
    console.log('\n\nレイアウト計算完了');
    console.log(`所要時間: ${(endTime - startTime) / 1000}秒`);

    // 最終結果のスコア
    let finalDetails: ReturnType<typeof calculateFitnessDetails>;
    try {
      finalDetails = calculateFitnessDetails(result.positions, objects, wires, options);
      printScoreDetails('最終結果', finalDetails, targetDetails);
      
      // 改善状況
      console.log(`\n=== 改善状況 ===`);
      const scoreImprovement = finalDetails.totalScore - initialDetails.totalScore;
      const crossingImprovement = initialDetails.wireCrossings.count - finalDetails.wireCrossings.count;
      const lengthImprovement = initialDetails.connectionLength.total - finalDetails.connectionLength.total;
      
      console.log(`総合スコア: ${scoreImprovement > 0 ? '改善' : scoreImprovement < 0 ? '悪化' : '変化なし'} (${scoreImprovement > 0 ? '+' : ''}${scoreImprovement.toFixed(1)})`);
      console.log(`配線交差: ${crossingImprovement > 0 ? '改善' : crossingImprovement < 0 ? '悪化' : '変化なし'} (${crossingImprovement > 0 ? '-' : ''}${Math.abs(crossingImprovement)}箇所)`);
      console.log(`接続長: ${lengthImprovement > 0 ? '改善' : lengthImprovement < 0 ? '悪化' : '変化なし'} (${lengthImprovement > 0 ? '-' : ''}${Math.round(Math.abs(lengthImprovement))}px)`);
      
      // 目標達成度
      console.log(`\n=== 目標達成度 ===`);
      const scoreProgress = ((finalDetails.totalScore - initialDetails.totalScore) / (targetDetails.totalScore - initialDetails.totalScore)) * 100;
      const crossingProgress = targetDetails.wireCrossings.count < initialDetails.wireCrossings.count
        ? ((initialDetails.wireCrossings.count - finalDetails.wireCrossings.count) / (initialDetails.wireCrossings.count - targetDetails.wireCrossings.count)) * 100
        : (finalDetails.wireCrossings.count <= targetDetails.wireCrossings.count ? 100 : 0);
      const lengthProgress = targetDetails.connectionLength.total < initialDetails.connectionLength.total
        ? ((initialDetails.connectionLength.total - finalDetails.connectionLength.total) / (initialDetails.connectionLength.total - targetDetails.connectionLength.total)) * 100
        : (finalDetails.connectionLength.total <= targetDetails.connectionLength.total ? 100 : 0);
      
      console.log(`総合スコア: ${Math.max(0, Math.min(100, scoreProgress)).toFixed(1)}%`);
      console.log(`配線交差: ${Math.max(0, Math.min(100, crossingProgress)).toFixed(1)}%`);
      console.log(`接続長: ${Math.max(0, Math.min(100, lengthProgress)).toFixed(1)}%`);
      
    } catch (e) {
      console.warn('最終結果の計算に失敗しました:', e);
    }

  } catch (error) {
    console.error('\n実行エラー:', error);
  }
}

runTest();
