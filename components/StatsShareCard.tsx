import { Text, View } from 'react-native';

interface StatsShareCardProps {
  booksRead: number;
  totalMinutes: number;
  totalPages: number;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
}

export default function StatsShareCard({
  booksRead,
  totalMinutes,
  totalPages,
  currentStreak,
  bestStreak,
  totalSessions,
}: StatsShareCardProps) {
  return (
    <View
      style={{
        width: 360,
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
      }}
    >
      {/* Title */}
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 8,
        }}
      >
        Mi lectura
      </Text>
      <Text style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>
        Resumen de actividad
      </Text>

      {/* Stats grid */}
      <View style={{ width: '100%', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatBox
            value={String(booksRead)}
            label="Libros leidos"
            color="#34D399"
          />
          <StatBox
            value={String(totalSessions)}
            label="Sesiones"
            color="#60A5FA"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatBox
            value={formatMinutes(totalMinutes)}
            label="Tiempo leyendo"
            color="#FBBF24"
          />
          <StatBox
            value={formatPages(totalPages)}
            label="Paginas leidas"
            color="#F472B6"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatBox
            value={`${currentStreak} dias`}
            label="Racha actual"
            color="#FF9500"
          />
          <StatBox
            value={`${bestStreak} dias`}
            label="Mejor racha"
            color="#FF9500"
          />
        </View>
      </View>

      {/* Branding */}
      <Text style={{ fontSize: 12, color: '#555', marginTop: 28, letterSpacing: 2 }}>
        ALEPH
      </Text>
    </View>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#2a2a4a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: 'bold', color }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  const remaining = min % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatPages(pages: number): string {
  if (pages >= 1000) return `${(pages / 1000).toFixed(1)}k`;
  return String(pages);
}
