import React, { useState } from 'react';
import { AlertCircle, FileText, Stethoscope } from 'lucide-react';

const PFTInterpreter = () => {
  const [results, setResults] = useState(null);
  
  // All PFT inputs in one state
  const [pft, setPft] = useState({
    // Pre-bronchodilator Spirometry
    preFev1Pred: '',
    preFev1Obs: '',
    preFvcPred: '',
    preFvcObs: '',
    preFev1FvcRatio: '',
    fev1FvcLLN: '',
    preVcPred: '',
    preVcObs: '',
    fef75Pred: '',
    fef75Obs: '',
    fef75FvcRatio: '',
    fef50FvcRatio: '',
    
    // Post-bronchodilator Spirometry
    postFev1Obs: '',
    postFvcObs: '',
    bronchodilatorGiven: false,
    
    // Previous PFT values
    hasPreviousPFT: false,
    prevFev1Obs: '',
    prevFvcObs: '',
    prevDlcoObs: '',
    
    // Lung Volumes
    tlcPred: '',
    tlcObs: '',
    tlcLLN: '',
    tlcULN: '',
    rvPred: '',
    rvObs: '',
    rvTlcRatio: '',
    rvTlcULN: '',
    frcPred: '',
    frcObs: '',
    frcLLN: '',
    frcULN: '',
    vcPred: '',
    vcObs: '',
    vcLLN: '',
    vcULN: '',
    
    // Airways Resistance
    rawPred: '',
    rawObs: '',
    rawLLN: '',
    rawULN: '',
    
    // DLCO
    dlcoPred: '',
    dlcoObs: '',
    dlcoLLN: '',
    dlcoULN: '',
    hemoglobin: false,
    
    // Clinical context
    hasRestrictionInRFR: false,
    
    // Oximetry
    hasOximetry: false,
    patientAge: '',
    restingSpO2: '',
    exercisePerformed: false,
    lowestExerciseSpO2: ''
  });

  const interpretPFT = () => {
    let interpretation = {
      spirometry: [],
      bronchodilator: '',
      comparison: '',
      lungVolumes: [],
      resistance: '',
      dlco: '',
      oximetry: '',
      summary: ''
    };

    // === SPIROMETRY INTERPRETATION ===
    const preFev1Pct = parseFloat(pft.preFev1Pred);
    const preFvcPct = parseFloat(pft.preFvcPred);
    const preVcPct = parseFloat(pft.preVcPred) || preFvcPct; // Use VC if available, otherwise FVC
    const ratio = parseFloat(pft.preFev1FvcRatio);
    const ratioLLN = parseFloat(pft.fev1FvcLLN);
    
    let spirometryAbnormal = false;
    
    if (!isNaN(ratio) && !isNaN(ratioLLN)) {
      if (ratio < ratioLLN) {
        // Airflow reduction present
        spirometryAbnormal = true;
        
        // Check if FVC or VC is in normal range (90-110% predicted)
        const fvcInRange = (preFvcPct >= 90 && preFvcPct <= 110) || (preVcPct >= 90 && preVcPct <= 110);
        
        if (fvcInRange) {
          // Use FEV1 % predicted for severity (Chart 1, Yes path)
          let severity = '';
          if (preFev1Pct >= 70) severity = 'Mild';
          else if (preFev1Pct >= 60) severity = 'Moderate';
          else if (preFev1Pct >= 50) severity = 'Moderately severe';
          else if (preFev1Pct >= 35) severity = 'Severe';
          else severity = 'Very severe';
          
          interpretation.spirometry.push(`${severity} airflow reduction (FEV1 ${preFev1Pct.toFixed(0)}% predicted).`);
        } else {
          // Use FEV1/FVC ratio for severity (Chart 1, No path)
          let severity = '';
          if (ratio >= 60) severity = 'Mild';
          else if (ratio >= 50) severity = 'Moderate';
          else if (ratio >= 35) severity = 'Severe';
          else severity = 'Very severe';
          
          interpretation.spirometry.push(`${severity} airflow reduction (FEV1/FVC ${ratio.toFixed(0)}%).`);
        }
      } else {
        // FEV1/FVC >= LLN (Chart 2)
        const fev1BelowLLN = preFev1Pct < 80;
        const fvcBelowLLN = preFvcPct < 80;
        const bothBelowLLN = fev1BelowLLN && fvcBelowLLN;
        
        if (bothBelowLLN) {
          spirometryAbnormal = true;
          interpretation.spirometry.push('Proportional reduction in FEV1 and FVC.');
          
          if (!pft.hasRestrictionInRFR) {
            interpretation.spirometry.push('Presence of a non-specific restrictive spirometry pattern, which can represent restriction (consider lung volume testing to verify), or can sometimes predict later evolution into COPD or restrictive lung disease – clinical correlation required.');
          }
        } else if ((fev1BelowLLN || fvcBelowLLN) && !(preFvcPct >= 90 && preFvcPct <= 110)) {
          spirometryAbnormal = true;
          if (!pft.hasRestrictionInRFR) {
            interpretation.spirometry.push('Presence of a restrictive spirometry pattern, which is a non-specific finding that can sometimes predict evolution into COPD or restrictive lung disease – clinical correlation required.');
          }
        } else {
          // Check for small airway abnormalities
          const fef75Obs = parseFloat(pft.fef75Obs);
          const fef75Pred = parseFloat(pft.fef75Pred);
          const fef75FvcRatio = parseFloat(pft.fef75FvcRatio);
          const fef50FvcRatio = parseFloat(pft.fef50FvcRatio);
          
          let smallAirwayFindings = [];
          
          // FEF75 below predicted is considered abnormal
          if (!isNaN(fef75Obs) && !isNaN(fef75Pred) && fef75Pred < 50) {
            smallAirwayFindings.push('airflow reduction at low lung volumes');
          }
          
          if (!isNaN(fef50FvcRatio) && fef50FvcRatio > 1.5) {
            smallAirwayFindings.push('increased flows at mid lung volumes');
          }
          
          if (!isNaN(fef75FvcRatio) && fef75FvcRatio < 0.25) {
            if (!smallAirwayFindings.includes('airflow reduction at low lung volumes')) {
              smallAirwayFindings.push('airflow reduction at low lung volumes');
            }
          }
          
          if (smallAirwayFindings.length > 0) {
            spirometryAbnormal = true;
            interpretation.spirometry.push(`Normal FEV1/FVC ratio with ${[...new Set(smallAirwayFindings)].join(' and ')}.`);
          } else {
            interpretation.spirometry.push('Normal spirometry.');
          }
        }
      }
    }

    // === BRONCHODILATOR RESPONSE ===
    if (pft.bronchodilatorGiven) {
      const preFev1Obs = parseFloat(pft.preFev1Obs);
      const postFev1Obs = parseFloat(pft.postFev1Obs);
      
      if (!isNaN(preFev1Obs) && !isNaN(postFev1Obs)) {
        const deltaFev1 = postFev1Obs - preFev1Obs;
        const percentChange = (deltaFev1 / preFev1Obs) * 100;
        
        // According to guideline: ≥200ml AND ≥12% change
        if (deltaFev1 >= 0.2 && percentChange >= 12) {
          interpretation.bronchodilator = 'Significant improvement post bronchodilator. Consistent with a diagnosis of asthma, clinical correlation is required.';
        } else {
          interpretation.bronchodilator = 'No significant improvement post bronchodilator.';
        }
      }
    } else {
      interpretation.bronchodilator = 'Bronchodilator not administered.';
    }

    // === COMPARISON TO PREVIOUS PFT ===
    if (pft.hasPreviousPFT) {
      const preFev1Obs = parseFloat(pft.preFev1Obs);
      const prevFev1Obs = parseFloat(pft.prevFev1Obs);
      const preFvcObs = parseFloat(pft.preFvcObs);
      const prevFvcObs = parseFloat(pft.prevFvcObs);
      const dlcoObs = parseFloat(pft.dlcoObs);
      const prevDlcoObs = parseFloat(pft.prevDlcoObs);
      
      let changes = [];
      
      // FEV1: >10% change is significant
      if (!isNaN(preFev1Obs) && !isNaN(prevFev1Obs)) {
        const fev1Change = ((preFev1Obs - prevFev1Obs) / prevFev1Obs * 100);
        if (Math.abs(fev1Change) > 10) {
          if (fev1Change > 0) {
            changes.push(`improvement in FEV1 (${Math.abs(fev1Change).toFixed(1)}%)`);
          } else {
            changes.push(`deterioration in FEV1 (${Math.abs(fev1Change).toFixed(1)}%)`);
          }
        }
      }
      
      // FVC: >10% change is significant
      if (!isNaN(preFvcObs) && !isNaN(prevFvcObs)) {
        const fvcChange = ((preFvcObs - prevFvcObs) / prevFvcObs * 100);
        if (Math.abs(fvcChange) > 10) {
          if (fvcChange > 0) {
            changes.push(`improvement in FVC (${Math.abs(fvcChange).toFixed(1)}%)`);
          } else {
            changes.push(`deterioration in FVC (${Math.abs(fvcChange).toFixed(1)}%)`);
          }
        }
      }
      
      // DLCO: >15% change is significant
      if (!isNaN(dlcoObs) && !isNaN(prevDlcoObs)) {
        const dlcoChange = ((dlcoObs - prevDlcoObs) / prevDlcoObs * 100);
        if (Math.abs(dlcoChange) > 15) {
          if (dlcoChange > 0) {
            changes.push(`improvement in DLCO (${Math.abs(dlcoChange).toFixed(1)}%)`);
          } else {
            changes.push(`deterioration in DLCO (${Math.abs(dlcoChange).toFixed(1)}%)`);
          }
        }
      }
      
      if (changes.length > 0) {
        interpretation.comparison = `Compared to previous: ${changes.join(', ')}.`;
      } else {
        interpretation.comparison = 'Compared to previous: no significant change.';
      }
    }

    // === LUNG VOLUMES ===
    const tlcPct = parseFloat(pft.tlcPred);
    const tlcObs = parseFloat(pft.tlcObs);
    const tlcLLN = parseFloat(pft.tlcLLN);
    const tlcULN = parseFloat(pft.tlcULN);
    const rvPct = parseFloat(pft.rvPred);
    const rvTlcRatio = parseFloat(pft.rvTlcRatio);
    const rvTlcULN = parseFloat(pft.rvTlcULN);
    
    let lungVolumesAbnormal = false;
    
    if (!isNaN(rvTlcRatio) && !isNaN(rvTlcULN) && !isNaN(tlcObs) && !isNaN(tlcLLN) && !isNaN(tlcULN)) {
      if (rvTlcRatio > rvTlcULN) {
        // Gas trapping present
        lungVolumesAbnormal = true;
        let gasTrapping = '';
        if (rvPct <= 150) gasTrapping = 'Mild gas trapping';
        else if (rvPct <= 250) gasTrapping = 'Moderate gas trapping';
        else gasTrapping = 'Severe gas trapping';
        
        interpretation.lungVolumes.push(gasTrapping + '.');
        
        // Check for hyperinflation
        if (tlcObs > tlcULN) {
          let hyperinflation = '';
          if (tlcPct <= 130) hyperinflation = 'mild hyperinflation';
          else if (tlcPct <= 150) hyperinflation = 'moderate hyperinflation';
          else hyperinflation = 'severe hyperinflation';
          interpretation.lungVolumes.push(`TLC shows ${hyperinflation}.`);
        } else if (tlcObs >= tlcLLN) {
          interpretation.lungVolumes.push('Normal TLC.');
        }
      } else {
        // No gas trapping
        if (tlcObs > tlcULN) {
          interpretation.lungVolumes.push('Large TLC, normal variant.');
        } else if (tlcObs >= tlcLLN) {
          interpretation.lungVolumes.push('Normal lung volumes.');
        } else {
          // TLC < LLN indicates restriction
          lungVolumesAbnormal = true;
          let restriction = '';
          if (tlcPct >= 65) restriction = 'Mild restriction';
          else if (tlcPct >= 50) restriction = 'Moderate restriction';
          else restriction = 'Severe restriction';
          interpretation.lungVolumes.push(restriction + '.');
        }
      }
    }

    // === AIRWAYS RESISTANCE ===
    const rawPct = parseFloat(pft.rawPred);
    const rawObs = parseFloat(pft.rawObs);
    const rawULN = parseFloat(pft.rawULN);
    const rawLLN = parseFloat(pft.rawLLN);
    
    if (!isNaN(rawObs)) {
      if ((!isNaN(rawULN) && rawObs > rawULN) || (!isNaN(rawPct) && rawPct > 177)) {
        interpretation.resistance = 'Increased airway resistance.';
      } else if ((!isNaN(rawLLN) && rawObs < rawLLN) || (!isNaN(rawPct) && rawPct < 66)) {
        interpretation.resistance = 'Reduced airway resistance.';
      } else {
        interpretation.resistance = 'Normal airway resistance.';
      }
    }

    // === DLCO ===
    const dlcoPct = parseFloat(pft.dlcoPred);
    const dlcoObs = parseFloat(pft.dlcoObs);
    const dlcoLLN = parseFloat(pft.dlcoLLN);
    const dlcoULN = parseFloat(pft.dlcoULN);
    const hbSuffix = pft.hemoglobin ? 'after Hb correction' : 'uncorrected for Hb';
    
    let dlcoAbnormal = false;
    
    if (!isNaN(dlcoPct)) {
      if (dlcoPct >= 75 && dlcoPct <= 125) {
        interpretation.dlco = `Normal diffusing capacity ${hbSuffix}.`;
      } else if (dlcoPct > 125) {
        interpretation.dlco = `Increased diffusing capacity ${hbSuffix} (DLCO ${dlcoPct.toFixed(0)}% predicted).`;
      } else {
        dlcoAbnormal = true;
        let severity = '';
        if (dlcoPct > 60) severity = 'Mild';
        else if (dlcoPct >= 40) severity = 'Moderate';
        else severity = 'Severe';
        interpretation.dlco = `${severity} diffusing capacity impairment ${hbSuffix} (DLCO ${dlcoPct.toFixed(0)}% predicted).`;
      }
    } else if (!isNaN(dlcoObs) && !isNaN(dlcoLLN) && !isNaN(dlcoULN)) {
      if (dlcoObs >= dlcoLLN && dlcoObs <= dlcoULN) {
        interpretation.dlco = `Normal diffusing capacity ${hbSuffix}.`;
      } else if (dlcoObs > dlcoULN) {
        interpretation.dlco = `Increased diffusing capacity ${hbSuffix}.`;
      } else {
        dlcoAbnormal = true;
        // Estimate severity based on observation
        let severity = 'Mild';
        if (dlcoLLN > 0) {
          const estimatedPct = (dlcoObs / dlcoLLN) * 75; // LLN typically around 75% predicted
          if (estimatedPct <= 40) severity = 'Severe';
          else if (estimatedPct <= 60) severity = 'Moderate';
        }
        interpretation.dlco = `${severity} diffusing capacity impairment ${hbSuffix}.`;
      }
    }

    // === OXIMETRY ===
    if (pft.hasOximetry) {
      const age = parseFloat(pft.patientAge);
      const restingSpO2 = parseFloat(pft.restingSpO2);
      const lowestExerciseSpO2 = parseFloat(pft.lowestExerciseSpO2);
      
      if (!isNaN(restingSpO2)) {
        // Determine normal resting SpO2 based on age (per Crapo reference)
        let normalRestingSpO2 = 96;
        if (age >= 18 && age <= 44) normalRestingSpO2 = 96;
        else if (age >= 45 && age <= 64) normalRestingSpO2 = 94;
        else if (age > 64) normalRestingSpO2 = 93;
        
        if (restingSpO2 >= normalRestingSpO2) {
          interpretation.oximetry = 'Normal resting oximetry on room air.';
        } else {
          interpretation.oximetry = 'Reduced resting oximetry on room air.';
        }
        
        // Check exercise desaturation if exercise was performed
        if (pft.exercisePerformed && !isNaN(lowestExerciseSpO2)) {
          const drop = restingSpO2 - lowestExerciseSpO2;
          
          // Sustained drop > 4% is significant
          if (drop > 4) {
            if (lowestExerciseSpO2 > 88) {
              interpretation.oximetry += ' Mild desaturation with exercise.';
            } else {
              interpretation.oximetry += ' Marked desaturation with exercise.';
            }
          } else {
            interpretation.oximetry += ' No significant desaturation with exercise.';
          }
        }
      }
    }

    // === SUMMARY ===
    const allNormal = !spirometryAbnormal && !lungVolumesAbnormal && !dlcoAbnormal && 
                      interpretation.resistance.includes('Normal') &&
                      interpretation.bronchodilator.includes('No significant') &&
                      (!interpretation.oximetry || interpretation.oximetry.includes('Normal'));
    
    if (allNormal) {
      interpretation.summary = 'In summary, normal pulmonary function testing.';
    } else {
      let abnormalities = [];
      if (spirometryAbnormal) {
        if (interpretation.spirometry[0].includes('airflow reduction')) {
          abnormalities.push('obstructive pattern');
        } else if (interpretation.spirometry[0].includes('restrictive') || interpretation.spirometry[0].includes('Proportional')) {
          abnormalities.push('restrictive spirometry pattern');
        } else if (interpretation.spirometry[0].includes('low lung volumes')) {
          abnormalities.push('small airway abnormality');
        }
      }
      if (lungVolumesAbnormal) {
        if (interpretation.lungVolumes[0].includes('restriction')) {
          abnormalities.push('restrictive lung disease');
        } else if (interpretation.lungVolumes[0].includes('gas trapping')) {
          abnormalities.push('gas trapping');
        }
        if (interpretation.lungVolumes.some(item => item.includes('hyperinflation'))) {
          abnormalities.push('hyperinflation');
        }
      }
      if (dlcoAbnormal) {
        abnormalities.push('reduced diffusion capacity');
      }
      if (interpretation.resistance.includes('Increased')) {
        abnormalities.push('increased airway resistance');
      }
      
      if (abnormalities.length > 0) {
        interpretation.summary = `In summary, pulmonary function testing demonstrates ${abnormalities.join(', ')}.`;
      } else {
        interpretation.summary = 'In summary, pulmonary function testing shows mixed patterns requiring clinical correlation.';
      }
    }

    setResults(interpretation);
  };

  const handleReset = () => {
    setResults(null);
    setPft({
      preFev1Pred: '', preFev1Obs: '', preFvcPred: '', preFvcObs: '', preFev1FvcRatio: '',
      fev1FvcLLN: '', preVcPred: '', preVcObs: '', fef75Pred: '', fef75Obs: '', fef75FvcRatio: '',
      fef50FvcRatio: '', postFev1Obs: '', postFvcObs: '', bronchodilatorGiven: false,
      hasPreviousPFT: false, prevFev1Obs: '', prevFvcObs: '', prevDlcoObs: '',
      tlcPred: '', tlcObs: '', tlcLLN: '', tlcULN: '', rvPred: '', rvObs: '',
      rvTlcRatio: '', rvTlcULN: '', frcPred: '', frcObs: '', frcLLN: '', frcULN: '',
      vcPred: '', vcObs: '', vcLLN: '', vcULN: '', rawPred: '', rawObs: '', rawLLN: '',
      rawULN: '', dlcoPred: '', dlcoObs: '', dlcoLLN: '', dlcoULN: '', hemoglobin: false,
      hasRestrictionInRFR: false, hasOximetry: false, patientAge: '', restingSpO2: '',
      exercisePerformed: false, lowestExerciseSpO2: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Stethoscope className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">PFT Comprehensive Interpreter</h1>
          </div>
          <p className="text-sm text-gray-600 ml-11">University of Toronto Guidelines - 10th Edition (2023)</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="space-y-8">
            {/* SPIROMETRY SECTION */}
            <div>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">
                Spirometry (Pre-Bronchodilator)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FVC Observed (L)</label>
                  <input type="number" step="0.01" value={pft.preFvcObs} onChange={(e) => setPft({...pft, preFvcObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 2.51" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FVC (% Predicted)</label>
                  <input type="number" value={pft.preFvcPred} onChange={(e) => setPft({...pft, preFvcPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 76" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEV1 Observed (L)</label>
                  <input type="number" step="0.01" value={pft.preFev1Obs} onChange={(e) => setPft({...pft, preFev1Obs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 2.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEV1 (% Predicted)</label>
                  <input type="number" value={pft.preFev1Pred} onChange={(e) => setPft({...pft, preFev1Pred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 76" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEV1/FVC Ratio (%)</label>
                  <input type="number" value={pft.preFev1FvcRatio} onChange={(e) => setPft({...pft, preFev1FvcRatio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 80" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEV1/FVC LLN (%)</label>
                  <input type="number" value={pft.fev1FvcLLN} onChange={(e) => setPft({...pft, fev1FvcLLN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 68.6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VC Observed (L)</label>
                  <input type="number" step="0.01" value={pft.preVcObs} onChange={(e) => setPft({...pft, preVcObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VC (% Predicted)</label>
                  <input type="number" value={pft.preVcPred} onChange={(e) => setPft({...pft, preVcPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEF25-75% Observed (L/s)</label>
                  <input type="number" step="0.01" value={pft.fef75Obs} onChange={(e) => setPft({...pft, fef75Obs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 2.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEF25-75% (% Predicted)</label>
                  <input type="number" value={pft.fef75Pred} onChange={(e) => setPft({...pft, fef75Pred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 79" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEF75/FVC Ratio</label>
                  <input type="number" step="0.01" value={pft.fef75FvcRatio} onChange={(e) => setPft({...pft, fef75FvcRatio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEF50/FVC Ratio</label>
                  <input type="number" step="0.01" value={pft.fef50FvcRatio} onChange={(e) => setPft({...pft, fef50FvcRatio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
              </div>
            </div>

            {/* POST-BRONCHODILATOR */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <input type="checkbox" id="bronchodilator" checked={pft.bronchodilatorGiven}
                  onChange={(e) => setPft({...pft, bronchodilatorGiven: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="bronchodilator" className="text-lg font-semibold text-gray-800">
                  Post-Bronchodilator Testing Performed
                </label>
              </div>
              {pft.bronchodilatorGiven && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Post-BD FVC Observed (L)</label>
                    <input type="number" step="0.01" value={pft.postFvcObs} onChange={(e) => setPft({...pft, postFvcObs: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 2.46" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Post-BD FEV1 Observed (L)</label>
                    <input type="number" step="0.01" value={pft.postFev1Obs} onChange={(e) => setPft({...pft, postFev1Obs: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 1.96" />
                  </div>
                </div>
              )}
            </div>

            {/* PREVIOUS PFT COMPARISON */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <input type="checkbox" id="previous" checked={pft.hasPreviousPFT}
                  onChange={(e) => setPft({...pft, hasPreviousPFT: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="previous" className="text-lg font-semibold text-gray-800">
                  Compare to Previous PFT
                </label>
              </div>
              {pft.hasPreviousPFT && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous FEV1 (L)</label>
                    <input type="number" step="0.01" value={pft.prevFev1Obs} onChange={(e) => setPft({...pft, prevFev1Obs: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 2.3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous FVC (L)</label>
                    <input type="number" step="0.01" value={pft.prevFvcObs} onChange={(e) => setPft({...pft, prevFvcObs: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 3.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous DLCO (mL/min/mmHg)</label>
                    <input type="number" step="0.1" value={pft.prevDlcoObs} onChange={(e) => setPft({...pft, prevDlcoObs: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 22.5" />
                  </div>
                </div>
              )}
            </div>

            {/* LUNG VOLUMES */}
            <div>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">Lung Volumes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TLC Observed (L)</label>
                  <input type="number" step="0.01" value={pft.tlcObs} onChange={(e) => setPft({...pft, tlcObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 4.25" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TLC (% Predicted)</label>
                  <input type="number" value={pft.tlcPred} onChange={(e) => setPft({...pft, tlcPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 82" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TLC LLN (L)</label>
                  <input type="number" step="0.01" value={pft.tlcLLN} onChange={(e) => setPft({...pft, tlcLLN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 4.2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TLC ULN (L)</label>
                  <input type="number" step="0.01" value={pft.tlcULN} onChange={(e) => setPft({...pft, tlcULN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 6.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RV Observed (L)</label>
                  <input type="number" step="0.01" value={pft.rvObs} onChange={(e) => setPft({...pft, rvObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 1.74" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RV (% Predicted)</label>
                  <input type="number" value={pft.rvPred} onChange={(e) => setPft({...pft, rvPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RV/TLC Ratio (%)</label>
                  <input type="number" value={pft.rvTlcRatio} onChange={(e) => setPft({...pft, rvTlcRatio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 41" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RV/TLC ULN (%)</label>
                  <input type="number" value={pft.rvTlcULN} onChange={(e) => setPft({...pft, rvTlcULN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 51.2" />
                </div>
              </div>
            </div>

            {/* AIRWAYS RESISTANCE */}
            <div>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">Airways Resistance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Observed (cmH₂O/L/s)</label>
                  <input type="number" step="0.01" value={pft.rawObs} onChange={(e) => setPft({...pft, rawObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 3.74" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw (% Predicted)</label>
                  <input type="number" value={pft.rawPred} onChange={(e) => setPft({...pft, rawPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 240" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw LLN (cmH₂O/L/s)</label>
                  <input type="number" step="0.01" value={pft.rawLLN} onChange={(e) => setPft({...pft, rawLLN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw ULN (cmH₂O/L/s)</label>
                  <input type="number" step="0.01" value={pft.rawULN} onChange={(e) => setPft({...pft, rawULN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Optional" />
                </div>
              </div>
            </div>

            {/* DLCO */}
            <div>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">Diffusion Capacity (DLCO)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DLCO Observed (mL/min/mmHg)</label>
                  <input type="number" step="0.1" value={pft.dlcoObs} onChange={(e) => setPft({...pft, dlcoObs: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 18.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DLCO (% Predicted)</label>
                  <input type="number" value={pft.dlcoPred} onChange={(e) => setPft({...pft, dlcoPred: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 90" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DLCO LLN (mL/min/mmHg)</label>
                  <input type="number" step="0.1" value={pft.dlcoLLN} onChange={(e) => setPft({...pft, dlcoLLN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 15.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DLCO ULN (mL/min/mmHg)</label>
                  <input type="number" step="0.1" value={pft.dlcoULN} onChange={(e) => setPft({...pft, dlcoULN: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 25.3" />
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="hemoglobin" checked={pft.hemoglobin}
                    onChange={(e) => setPft({...pft, hemoglobin: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded" />
                  <label htmlFor="hemoglobin" className="text-sm text-gray-700">Corrected for hemoglobin (Hb)</label>
                </div>
              </div>
            </div>

            {/* CLINICAL CONTEXT */}
            <div>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">Clinical Context</h2>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasRestriction" checked={pft.hasRestrictionInRFR}
                  onChange={(e) => setPft({...pft, hasRestrictionInRFR: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="hasRestriction" className="text-sm text-gray-700">
                  Evident cause of restriction in reason for referral or known restriction in plethysmography
                </label>
              </div>
            </div>

            {/* OXIMETRY */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <input type="checkbox" id="hasOximetry" checked={pft.hasOximetry}
                  onChange={(e) => setPft({...pft, hasOximetry: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="hasOximetry" className="text-lg font-semibold text-gray-800">
                  Oximetry Testing Performed
                </label>
              </div>
              {pft.hasOximetry && (
                <div className="space-y-4 pl-7">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age (years)</label>
                      <input type="number" value={pft.patientAge} onChange={(e) => setPft({...pft, patientAge: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 55" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resting SpO₂ on Room Air (%)</label>
                      <input type="number" step="1" value={pft.restingSpO2} onChange={(e) => setPft({...pft, restingSpO2: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 95" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="exercisePerformed" checked={pft.exercisePerformed}
                      onChange={(e) => setPft({...pft, exercisePerformed: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded" />
                    <label htmlFor="exercisePerformed" className="text-sm font-medium text-gray-800">
                      Exercise Testing Performed (Walk/Treadmill)
                    </label>
                  </div>
                  
                  {pft.exercisePerformed && (
                    <div className="pl-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lowest Exercise SpO₂ (%)</label>
                      <input type="number" step="1" value={pft.lowestExerciseSpO2} onChange={(e) => setPft({...pft, lowestExerciseSpO2: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 88" />
                      <p className="text-xs text-gray-600 mt-1">
                        Note: Sustained drop = stable or declining for ≥ 1 minute
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BUTTONS */}
            <div className="flex gap-4 pt-4">
              <button onClick={interpretPFT}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                Generate Complete Interpretation
              </button>
              <button onClick={handleReset}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        {results && (
          <div className="mt-6 bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete PFT Interpretation</h2>
                
                <div className="space-y-4">
                  {results.spirometry.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                      <h3 className="font-semibold text-gray-800 mb-2">Spirometry:</h3>
                      {results.spirometry.map((item, idx) => (
                        <p key={idx} className="text-gray-800">{item}</p>
                      ))}
                    </div>
                  )}

                  {results.bronchodilator && (
                    <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                      <p className="text-gray-800">{results.bronchodilator}</p>
                    </div>
                  )}

                  {results.comparison && (
                    <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
                      <p className="text-gray-800">{results.comparison}</p>
                    </div>
                  )}

                  {results.lungVolumes.length > 0 && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                      <h3 className="font-semibold text-gray-800 mb-2">Lung Volumes:</h3>
                      {results.lungVolumes.map((item, idx) => (
                        <p key={idx} className="text-gray-800">{item}</p>
                      ))}
                    </div>
                  )}

                  {results.resistance && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                      <p className="text-gray-800">{results.resistance}</p>
                    </div>
                  )}

                  {results.dlco && (
                    <div className="bg-pink-50 border-l-4 border-pink-600 p-4 rounded">
                      <p className="text-gray-800">{results.dlco}</p>
                    </div>
                  )}

                  {results.oximetry && (
                    <div className="bg-teal-50 border-l-4 border-teal-600 p-4 rounded">
                      <h3 className="font-semibold text-gray-800 mb-2">Oximetry:</h3>
                      <p className="text-gray-800">{results.oximetry}</p>
                    </div>
                  )}

                  <div className="bg-gray-800 text-white p-4 rounded-lg mt-6">
                    <p className="text-lg font-semibold">{results.summary}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 italic">
                    Based on: Guidelines for PFT Interpretation, 10th Edition, University of Toronto, 
                    Department of Medicine (June 13, 2023)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PFTInterpreter;