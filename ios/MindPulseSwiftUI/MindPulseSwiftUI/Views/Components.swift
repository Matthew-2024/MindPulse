import SwiftUI

struct MPCard<Content: View>: View {
    var tint: Color = .white
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            content
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(tint)
                .shadow(color: Color.black.opacity(0.06), radius: 18, x: 0, y: 10)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 1)
        )
    }
}

struct MetricTile: View {
    var title: String
    var value: String
    var accent: Color = .orange

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
                .foregroundStyle(accent)
                .lineLimit(2)
                .minimumScaleFactor(0.72)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.78))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }
}

struct PrimaryButton: View {
    var title: String
    var systemImage: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage ?? "arrow.right")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(LinearGradient(colors: [Color.mint.opacity(0.95), Color.green.opacity(0.65)], startPoint: .leading, endPoint: .trailing))
        )
    }
}

struct SecondaryButton: View {
    var title: String
    var systemImage: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage ?? "info.circle")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Color(red: 0.18, green: 0.29, blue: 0.26))
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white.opacity(0.72))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }
}

struct PageBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                LinearGradient(colors: [
                    Color(red: 0.98, green: 0.96, blue: 0.92),
                    Color(red: 0.91, green: 0.96, blue: 0.94)
                ], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            )
    }
}

extension View {
    func mindPulseBackground() -> some View {
        modifier(PageBackground())
    }
}

struct SectionHeader: View {
    var title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title2.bold())
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct InterventionRow: View {
    var id: InterventionID
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: id.symbol)
                .font(.headline)
                .frame(width: 38, height: 38)
                .background(Color.mint.opacity(0.14), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(id.title)
                    .font(.subheadline.bold())
                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(12)
        .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
