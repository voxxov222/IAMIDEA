import React, { useState, useEffect } from 'react';
import { DashboardWidget } from '../types';
import { Activity, Zap, HardDrive, Server, Wifi, Users, DollarSign, AlertTriangle, Shield, Lock, MapPin, Compass, Gauge, Thermometer, Wind, Droplets, Sun, Moon, Settings, Clock as ClockIcon, Globe } from 'lucide-react';

const BaseWidget = ({ title, icon: Icon, children, color = "neon-blue" }: any) => (
  <div className="h-full flex flex-col bg-space-900/50 rounded p-3 overflow-hidden border border-white/5">
    <div className={`flex items-center gap-2 text-${color} mb-2`}>
      {Icon && <Icon size={14} />}
      <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
    </div>
    <div className="flex-1 relative flex items-center justify-center">
      {children}
    </div>
  </div>
);

export const RadarSweepWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Radar Sweep" icon={Zap} color="emerald-400">
    <div className="w-24 h-24 rounded-full border border-emerald-500/30 relative overflow-hidden">
      <div className="absolute inset-0 border border-emerald-500/20 rounded-full scale-50" />
      <div className="absolute inset-0 border border-emerald-500/20 rounded-full scale-75" />
      <div className="w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/40 to-transparent absolute top-0 right-0 origin-bottom-left animate-spin" style={{ animationDuration: '3s' }} />
    </div>
  </BaseWidget>
);

export const AudioVisualizerWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [bars, setBars] = useState(Array(10).fill(0));
  useEffect(() => {
    const i = setInterval(() => setBars(b => b.map(() => Math.random() * 100)), 100);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Audio Sync" icon={Activity} color="neon-pink">
      <div className="flex items-end gap-1 h-full w-full px-2">
        {bars.map((h, i) => <div key={`bar-${i}`} className="flex-1 bg-neon-pink/50 transition-all duration-100" style={{ height: `${h}%` }} />)}
      </div>
    </BaseWidget>
  );
};

export const HeartRateWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [bpm, setBpm] = useState(72);
  useEffect(() => {
    const i = setInterval(() => setBpm(70 + Math.floor(Math.random() * 15)), 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Vitals" icon={Activity} color="red-500">
      <div className="text-center">
        <div className="text-4xl font-bold text-red-500 animate-pulse">{bpm}</div>
        <div className="text-[10px] text-gray-400">BPM</div>
      </div>
    </BaseWidget>
  );
};

export const BatteryStatusWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [level, setLevel] = useState(100);
  useEffect(() => {
    const i = setInterval(() => setLevel(l => Math.max(0, l - 1)), 5000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Power Cell" icon={Zap} color="yellow-400">
      <div className="w-16 h-8 border-2 border-gray-500 rounded p-0.5 relative">
        <div className="absolute -right-1.5 top-2 w-1 h-3 bg-gray-500 rounded-r" />
        <div className={`h-full transition-all duration-1000 ${level > 20 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${level}%` }} />
      </div>
      <div className="absolute bottom-2 text-xs font-mono">{level}%</div>
    </BaseWidget>
  );
};

export const MemoryUsageWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [mem, setMem] = useState(45);
  useEffect(() => {
    const i = setInterval(() => setMem(m => Math.min(100, Math.max(0, m + (Math.random() * 10 - 5)))), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="RAM Usage" icon={HardDrive} color="neon-purple">
      <div className="w-full h-full flex flex-col justify-center px-4">
        <div className="text-right text-xs mb-1 font-mono">{mem.toFixed(1)}%</div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-neon-purple transition-all duration-500" style={{ width: `${mem}%` }} />
        </div>
      </div>
    </BaseWidget>
  );
};

export const DiskSpaceWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Storage" icon={HardDrive} color="blue-400">
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="10" fill="none" />
        <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset="62.8" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">75%</div>
    </div>
  </BaseWidget>
);

export const ServerPingWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [ping, setPing] = useState(24);
  useEffect(() => {
    const i = setInterval(() => setPing(Math.floor(20 + Math.random() * 15)), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Latency" icon={Server} color="emerald-400">
      <div className="text-center">
        <div className="text-3xl font-mono text-emerald-400">{ping}</div>
        <div className="text-[10px] text-gray-400">ms</div>
      </div>
    </BaseWidget>
  );
};

export const DownloadSpeedWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [speed, setSpeed] = useState(120);
  useEffect(() => {
    const i = setInterval(() => setSpeed(100 + Math.random() * 50), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="DL Speed" icon={Wifi} color="cyan-400">
      <div className="text-center">
        <div className="text-2xl font-mono text-cyan-400">{speed.toFixed(1)}</div>
        <div className="text-[10px] text-gray-400">MB/s</div>
      </div>
    </BaseWidget>
  );
};

export const UploadSpeedWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [speed, setSpeed] = useState(45);
  useEffect(() => {
    const i = setInterval(() => setSpeed(40 + Math.random() * 20), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="UL Speed" icon={Wifi} color="pink-400">
      <div className="text-center">
        <div className="text-2xl font-mono text-pink-400">{speed.toFixed(1)}</div>
        <div className="text-[10px] text-gray-400">MB/s</div>
      </div>
    </BaseWidget>
  );
};

export const ActiveUsersWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [users, setUsers] = useState(1337);
  useEffect(() => {
    const i = setInterval(() => setUsers(u => u + Math.floor(Math.random() * 5 - 2)), 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Active Users" icon={Users} color="neon-blue">
      <div className="text-3xl font-bold text-white tracking-wider">{users.toLocaleString()}</div>
    </BaseWidget>
  );
};

export const RevenueChartWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Revenue" icon={DollarSign} color="emerald-400">
    <div className="w-full h-full flex items-end gap-1 px-2 pb-2">
      {[40, 60, 45, 80, 65, 90, 100].map((h, i) => (
        <div key={`rev-${i}`} className="flex-1 bg-emerald-500/50 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </BaseWidget>
);

export const ConversionRateWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Conversion" icon={Activity} color="yellow-400">
    <div className="text-center">
      <div className="text-3xl font-bold text-yellow-400">4.2%</div>
      <div className="text-[10px] text-emerald-400 mt-1">↑ 0.5% today</div>
    </div>
  </BaseWidget>
);

export const ErrorRateWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [rate, setRate] = useState(0.1);
  useEffect(() => {
    const i = setInterval(() => setRate(Math.random() * 0.5), 3000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Error Rate" icon={AlertTriangle} color="red-500">
      <div className="text-center">
        <div className="text-3xl font-mono text-red-500">{rate.toFixed(2)}%</div>
      </div>
    </BaseWidget>
  );
};

export const DatabaseLoadWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [load, setLoad] = useState(65);
  useEffect(() => {
    const i = setInterval(() => setLoad(60 + Math.random() * 20), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="DB Load" icon={Server} color="orange-400">
      <div className="w-full px-4">
        <div className="h-4 bg-gray-800 rounded overflow-hidden relative">
          <div className="absolute inset-0 bg-orange-500/20" />
          <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${load}%` }} />
        </div>
      </div>
    </BaseWidget>
  );
};

export const CacheHitRatioWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Cache Hits" icon={HardDrive} color="emerald-300">
    <div className="text-center">
      <div className="text-3xl font-bold text-emerald-300">94.8%</div>
    </div>
  </BaseWidget>
);

export const ApiRequestsWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [reqs, setReqs] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setReqs(r => r + Math.floor(Math.random() * 50)), 100);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="API Reqs" icon={Activity} color="neon-blue">
      <div className="text-2xl font-mono text-white">{reqs.toLocaleString()}</div>
    </BaseWidget>
  );
};

export const LatencyGraphWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [data, setData] = useState(Array(20).fill(20));
  useEffect(() => {
    const i = setInterval(() => setData(d => [...d.slice(1), 20 + Math.random() * 30]), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Latency History" icon={Activity} color="purple-400">
      <div className="w-full h-full flex items-end gap-[1px] px-1">
        {data.map((h, i) => <div key={`lat-${i}`} className="flex-1 bg-purple-500/50" style={{ height: `${h}%` }} />)}
      </div>
    </BaseWidget>
  );
};

export const UptimeCounterWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [time, setTime] = useState(999999);
  useEffect(() => {
    const i = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const d = Math.floor(time / 86400);
  const h = Math.floor((time % 86400) / 3600);
  const m = Math.floor((time % 3600) / 60);
  return (
    <BaseWidget title="Uptime" icon={ClockIcon} color="emerald-400">
      <div className="text-xl font-mono text-emerald-400">{d}d {h}h {m}m</div>
    </BaseWidget>
  );
};

export const SecurityAlertsWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Security" icon={Shield} color="red-500">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
        <AlertTriangle className="text-red-500" size={24} />
      </div>
      <div>
        <div className="text-2xl font-bold text-red-500">3</div>
        <div className="text-[10px] text-gray-400 uppercase">Active Alerts</div>
      </div>
    </div>
  </BaseWidget>
);

export const ThreatLevelWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Threat Level" icon={AlertTriangle} color="orange-500">
    <div className="text-center">
      <div className="text-2xl font-bold text-orange-500 uppercase tracking-widest">Elevated</div>
      <div className="w-full h-1 bg-gray-800 mt-2 rounded">
        <div className="w-3/5 h-full bg-orange-500 rounded" />
      </div>
    </div>
  </BaseWidget>
);

export const FirewallStatusWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Firewall" icon={Shield} color="emerald-500">
    <div className="flex flex-col items-center gap-2">
      <Shield className="text-emerald-500" size={32} />
      <div className="text-xs text-emerald-500 uppercase tracking-widest">Active</div>
    </div>
  </BaseWidget>
);

export const EncryptionStatusWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Encryption" icon={Lock} color="neon-blue">
    <div className="text-center">
      <div className="text-xl font-mono text-neon-blue">AES-256</div>
      <div className="text-[10px] text-gray-400 mt-1">SECURE</div>
    </div>
  </BaseWidget>
);

export const VpnConnectionWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="VPN Node" icon={Globe} color="cyan-400">
    <div className="text-center">
      <div className="text-lg font-bold text-white">EU-WEST-1</div>
      <div className="text-[10px] text-cyan-400 mt-1">Connected</div>
    </div>
  </BaseWidget>
);

export const SatelliteTrackingWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Satellites" icon={MapPin} color="neon-purple">
    <div className="relative w-24 h-24 rounded-full border border-white/10">
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-neon-blue rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-4 left-4 w-1.5 h-1.5 bg-neon-purple rounded-full animate-ping" />
      <div className="absolute bottom-6 right-8 w-1.5 h-1.5 bg-neon-purple rounded-full animate-ping" style={{ animationDelay: '1s' }} />
    </div>
  </BaseWidget>
);

export const GpsCoordinatesWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="GPS Loc" icon={MapPin} color="emerald-400">
    <div className="text-center font-mono text-xs space-y-1 text-emerald-400">
      <div>LAT: 37.7749° N</div>
      <div>LNG: 122.4194° W</div>
    </div>
  </BaseWidget>
);

export const CompassWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setHeading(h => (h + 1) % 360), 100);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Heading" icon={Compass} color="yellow-400">
      <div className="relative w-20 h-20 rounded-full border-2 border-yellow-400/30 flex items-center justify-center">
        <div className="absolute text-[10px] top-1 text-yellow-400">N</div>
        <div className="w-1 h-16 bg-gradient-to-t from-transparent to-yellow-400 origin-center transition-transform duration-100" style={{ transform: `rotate(${heading}deg)` }} />
      </div>
    </BaseWidget>
  );
};

export const AltimeterWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [alt, setAlt] = useState(10500);
  useEffect(() => {
    const i = setInterval(() => setAlt(a => a + (Math.random() * 10 - 5)), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Altitude" icon={Activity} color="cyan-400">
      <div className="text-center">
        <div className="text-3xl font-mono text-cyan-400">{Math.round(alt)}</div>
        <div className="text-[10px] text-gray-400">FEET</div>
      </div>
    </BaseWidget>
  );
};

export const SpeedometerWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [speed, setSpeed] = useState(85);
  useEffect(() => {
    const i = setInterval(() => setSpeed(s => Math.max(0, Math.min(160, s + (Math.random() * 4 - 2)))), 200);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Speed" icon={Gauge} color="red-500">
      <div className="text-center">
        <div className="text-4xl font-bold text-white italic">{Math.round(speed)}</div>
        <div className="text-[10px] text-red-500">MPH</div>
      </div>
    </BaseWidget>
  );
};

export const TachometerWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [rpm, setRpm] = useState(3000);
  useEffect(() => {
    const i = setInterval(() => setRpm(r => Math.max(800, Math.min(8000, r + (Math.random() * 200 - 100)))), 100);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="RPM" icon={Gauge} color="orange-500">
      <div className="text-center">
        <div className="text-3xl font-mono text-orange-500">{Math.round(rpm)}</div>
      </div>
    </BaseWidget>
  );
};

export const FuelGaugeWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Fuel" icon={Droplets} color="yellow-500">
    <div className="w-full px-4 flex items-center gap-2">
      <span className="text-xs font-bold text-red-500">E</span>
      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className="w-3/4 h-full bg-yellow-500" />
      </div>
      <span className="text-xs font-bold text-white">F</span>
    </div>
  </BaseWidget>
);

export const EngineTempWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Engine Temp" icon={Thermometer} color="red-400">
    <div className="text-center">
      <div className="text-2xl font-bold text-red-400">210°F</div>
      <div className="text-[10px] text-gray-400 mt-1">NOMINAL</div>
    </div>
  </BaseWidget>
);

export const OilPressureWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Oil Press" icon={Activity} color="orange-400">
    <div className="text-center">
      <div className="text-2xl font-mono text-orange-400">45 PSI</div>
    </div>
  </BaseWidget>
);

export const GearIndicatorWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Gear" icon={Settings} color="white">
    <div className="text-5xl font-bold text-white">4</div>
  </BaseWidget>
);

export const GForceMeterWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [g, setG] = useState(1.0);
  useEffect(() => {
    const i = setInterval(() => setG(1.0 + Math.random() * 0.5), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="G-Force" icon={Activity} color="neon-blue">
      <div className="text-3xl font-mono text-neon-blue">{g.toFixed(2)} G</div>
    </BaseWidget>
  );
};

export const GyroscopeWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Gyro" icon={Compass} color="purple-400">
    <div className="text-xs font-mono space-y-1 text-purple-400">
      <div>X: 12.4°</div>
      <div>Y: -5.2°</div>
      <div>Z: 0.1°</div>
    </div>
  </BaseWidget>
);

export const AccelerometerWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Accel" icon={Activity} color="emerald-400">
    <div className="text-xs font-mono space-y-1 text-emerald-400">
      <div>X: 0.02 m/s²</div>
      <div>Y: 9.81 m/s²</div>
      <div>Z: -0.01 m/s²</div>
    </div>
  </BaseWidget>
);

export const MagneticFieldWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Magnetic" icon={Activity} color="cyan-400">
    <div className="text-2xl font-mono text-cyan-400">45.2 µT</div>
  </BaseWidget>
);

export const LightSensorWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Ambient Light" icon={Sun} color="yellow-300">
    <div className="text-2xl font-mono text-yellow-300">320 lx</div>
  </BaseWidget>
);

export const ProximitySensorWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Proximity" icon={Activity} color="pink-400">
    <div className="text-2xl font-bold text-pink-400 uppercase">Clear</div>
  </BaseWidget>
);

export const PressureSensorWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Pressure" icon={Wind} color="blue-300">
    <div className="text-2xl font-mono text-blue-300">1013 hPa</div>
  </BaseWidget>
);

export const HumiditySensorWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Humidity" icon={Droplets} color="cyan-500">
    <div className="text-3xl font-bold text-cyan-500">42%</div>
  </BaseWidget>
);

export const Co2LevelWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="CO2 Level" icon={Wind} color="emerald-500">
    <div className="text-center">
      <div className="text-2xl font-mono text-emerald-500">415</div>
      <div className="text-[10px] text-gray-400">PPM</div>
    </div>
  </BaseWidget>
);

export const AirQualityWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="AQI" icon={Wind} color="green-400">
    <div className="text-center">
      <div className="text-3xl font-bold text-green-400">45</div>
      <div className="text-[10px] text-green-400 mt-1 uppercase">Good</div>
    </div>
  </BaseWidget>
);

export const RadiationLevelWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Radiation" icon={AlertTriangle} color="yellow-500">
    <div className="text-center">
      <div className="text-2xl font-mono text-yellow-500">0.12</div>
      <div className="text-[10px] text-gray-400">µSv/h</div>
    </div>
  </BaseWidget>
);

export const SeismicActivityWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [mag, setMag] = useState(1.2);
  useEffect(() => {
    const i = setInterval(() => setMag(1.0 + Math.random() * 0.5), 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <BaseWidget title="Seismic" icon={Activity} color="orange-500">
      <div className="text-center">
        <div className="text-3xl font-bold text-orange-500">{mag.toFixed(1)}</div>
        <div className="text-[10px] text-gray-400">MAGNITUDE</div>
      </div>
    </BaseWidget>
  );
};

export const SolarFlareWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Solar Flare" icon={Sun} color="orange-400">
    <div className="text-2xl font-bold text-orange-400 uppercase">Class C</div>
  </BaseWidget>
);

export const LunarPhaseWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Lunar Phase" icon={Moon} color="gray-300">
    <div className="text-center">
      <Moon className="mx-auto text-gray-300 mb-2" size={32} />
      <div className="text-xs uppercase tracking-widest text-gray-300">Waxing</div>
    </div>
  </BaseWidget>
);

export const TideLevelWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Tide Level" icon={Droplets} color="blue-400">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-400">Rising</div>
      <div className="text-[10px] text-gray-400 mt-1">+1.2m</div>
    </div>
  </BaseWidget>
);

export const WindDirectionWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Wind Dir" icon={Wind} color="cyan-300">
    <div className="text-2xl font-bold text-cyan-300">NW</div>
  </BaseWidget>
);

export const PrecipitationProbWidget = ({ widget }: { widget: DashboardWidget }) => (
  <BaseWidget title="Rain Prob" icon={Droplets} color="blue-500">
    <div className="text-3xl font-bold text-blue-500">15%</div>
  </BaseWidget>
);
