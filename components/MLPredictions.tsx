'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Brain, Activity, CloudRain } from 'lucide-react';

interface Prediction {
  sensor_id: string;
  predictedLevel: number;
  confidence: number;
  timeHorizon: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  recommendedAction: string;
  reasoning: string[];
  timestamp: string;
}

interface MLInsights {
  overview?: {
    performance: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    modelStatus: {
      linearPredictor: { trained: boolean; loss: number };
      neuralNetwork: { trained: boolean; accuracy: number };
      mdp: { converged: boolean; iterations: number };
    };
  };
  patterns?: any;
  anomalies?: any;
}

export default function MLPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [insights, setInsights] = useState<MLInsights>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'insights' | 'training'>('predictions');
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    fetchPredictions();
    fetchInsights();
    const interval = setInterval(fetchPredictions, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPredictions = async () => {
    try {
      const response = await fetch('/api/predictions?hours=6');
      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/ml-insights?type=overview');
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const trainModels = async () => {
    setIsTraining(true);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'train' }),
      });
      const data = await response.json();
      alert(`Training complete! Accuracy: ${(data.metrics?.neuralAccuracy * 100).toFixed(1)}%`);
      fetchInsights();
    } catch (error) {
      console.error('Error training models:', error);
      alert('Training failed. Please try again.');
    } finally {
      setIsTraining(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'extreme': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'extreme':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'moderate':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">AI/ML Flood Predictions</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'predictions'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Predictions
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'insights'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'training'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Training
          </button>
        </div>
      </div>

      {activeTab === 'predictions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating predictions...</p>
            </div>
          ) : predictions.length > 0 ? (
            predictions.map((prediction, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Sensor {prediction.sensor_id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(prediction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full flex items-center space-x-1 ${getRiskColor(prediction.riskLevel)}`}>
                    {getRiskIcon(prediction.riskLevel)}
                    <span className="font-semibold capitalize">{prediction.riskLevel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Predicted Level</p>
                    <p className="font-semibold text-lg">{prediction.predictedLevel.toFixed(2)}m</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidence</p>
                    <p className="font-semibold text-lg">{(prediction.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time Horizon</p>
                    <p className="font-semibold text-lg">{prediction.timeHorizon}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    <p className="font-semibold text-sm">{prediction.recommendedAction}</p>
                  </div>
                </div>

                <details className="cursor-pointer">
                  <summary className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    View AI Reasoning
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {prediction.reasoning.map((reason, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CloudRain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No predictions available</p>
              <p className="text-sm text-gray-500 mt-1">Waiting for sensor data...</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          {insights.overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Accuracy</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(insights.overview.performance.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Precision</p>
                  <p className="text-2xl font-bold text-green-900">
                    {(insights.overview.performance.precision * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Recall</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(insights.overview.performance.recall * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">F1 Score</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {(insights.overview.performance.f1Score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Model Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Linear Predictor</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        insights.overview.modelStatus.linearPredictor.trained
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.overview.modelStatus.linearPredictor.trained ? 'Trained' : 'Untrained'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Loss: {insights.overview.modelStatus.linearPredictor.loss.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Neural Network</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        insights.overview.modelStatus.neuralNetwork.trained
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.overview.modelStatus.neuralNetwork.trained ? 'Trained' : 'Untrained'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Accuracy: {(insights.overview.modelStatus.neuralNetwork.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">MDP (Decision Process)</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        insights.overview.modelStatus.mdp.converged
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {insights.overview.modelStatus.mdp.converged ? 'Converged' : 'Optimizing'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Iterations: {insights.overview.modelStatus.mdp.iterations}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3">Model Training</h3>
            <p className="text-gray-600 mb-4">
              Train the AI models with the latest 30 days of sensor data to improve prediction accuracy.
            </p>
            <button
              onClick={trainModels}
              disabled={isTraining}
              className={`px-6 py-3 rounded-lg font-medium ${
                isTraining
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isTraining ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Training Models...
                </span>
              ) : (
                'Start Training'
              )}
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">ML Algorithms</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-purple-600">Linear Regression (CS221)</h4>
                <p className="text-sm text-gray-600">
                  Uses gradient descent to predict future water levels based on historical patterns.
                  Minimizes squared loss: Loss(x, y, w) = (f_w(x) - y)²
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-600">Neural Network (Deep Learning)</h4>
                <p className="text-sm text-gray-600">
                  Multi-layer perceptron with ReLU activation for flood pattern recognition.
                  Architecture: [5 inputs → 10 hidden → 5 hidden → 1 output]
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-600">Markov Decision Process (MDP)</h4>
                <p className="text-sm text-gray-600">
                  Optimal policy learning for alert generation under uncertainty.
                  Uses value iteration with γ=0.9 discount factor.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}