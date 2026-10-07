// trame <video> <sortie-prefixe> : 3 images (20 %, 50 %, 80 %) en JPEG, et la durée sur stdout
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let d = CMTimeGetSeconds(asset.duration)
let g = AVAssetImageGenerator(asset: asset)
g.appliesPreferredTrackTransform = true
g.maximumSize = CGSize(width: 1280, height: 1280)
var n = 0
for (i, f) in [0.35].enumerated() {
    let t = CMTime(seconds: max(0.1, d * f), preferredTimescale: 600)
    if let cg = try? g.copyCGImage(at: t, actualTime: nil) {
        let rep = NSBitmapImageRep(cgImage: cg)
        if let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.7]) {
            try? data.write(to: URL(fileURLWithPath: "\(a[2])_\(i).jpg")); n += 1
        }
    }
}
print(String(format: "%.1f", d), n)
