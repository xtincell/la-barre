// animatique-v8.swift — l'animatique verticale de « Le son du moment », storyboard v8, sur le mashup de 55 s.
//
// Demande d'Alex (13/10/2026) : le storyboard v8 est prêt, l'audio a été mis à jour. Le montage suit une
// timeline JSON (case, début, fin, mouvement, sous-titre) calée sur la transcription du mashup : paroles
// réelles jusqu'à 28,5 s, puis la partie « viral dance » sur ses temps forts. Le break « Il dit quoi ? »
// est un arrêt sur image à la jonction des deux refrains — le mashup ne coupe pas la musique.
//
// Usage : swift outils/animatique-v8.swift <timeline.json> <son.m4a> <logo.png> <vague.png> <sortie.mp4>   (DEBIT=… pour la version web)

import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import AppKit

let a = CommandLine.arguments
guard a.count == 6 else { print("usage : timeline.json son.m4a logo.png vague.png sortie.mp4"); exit(1) }
struct Plan: Decodable { let image: String; let debut: Double; let fin: Double; let mouvement: String; let texte: String? }
struct Timeline: Decodable { let duree: Double; let tempo: Double; let plans: [Plan] }
let tl = try JSONDecoder().decode(Timeline.self, from: Data(contentsOf: URL(fileURLWithPath: a[1])))
let sonURL = URL(fileURLWithPath: a[2]), sortie = URL(fileURLWithPath: a[5])
let videoSeule = sortie.deletingLastPathComponent().appendingPathComponent("_video-v8.mp4")
for u in [videoSeule, sortie] { try? FileManager.default.removeItem(at: u) }

let W = 720, H = 1280, FPS = 30
func charger(_ p: String) -> CGImage {
  let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: p) as CFURL, nil)!; return CGImageSourceCreateImageAtIndex(s, 0, nil)!
}
var cache: [String: CGImage] = [:]
func image(_ p: String) -> CGImage { if let i = cache[p] { return i }; let i = charger(p); cache[p] = i; return i }
let logo = charger(a[3]), vague = charger(a[4])
let BLANC = CGColor(red: 1, green: 1, blue: 1, alpha: 1)

func lisse(_ x: Double) -> Double { let u = min(max(x, 0), 1); return u * u * (3 - 2 * u) }
func sortieDos(_ x: Double) -> Double { let u = min(max(x, 0), 1) - 1, s = 1.7; return 1 + u * u * ((s + 1) * u + s) }
func pulse(_ t: Double) -> Double {
  let p = t.truncatingRemainder(dividingBy: tl.tempo); return 0.025 * exp(-p * 12)
}

func dessiner(_ cx: CGContext, _ im: CGImage, s: Double, dx: Double = 0, dy: Double = 0) {
  let ech = max(Double(W) / Double(im.width), Double(H) / Double(im.height)) * s
  let w = Double(im.width) * ech, h = Double(im.height) * ech
  cx.interpolationQuality = .high
  cx.draw(im, in: CGRect(x: (Double(W) - w) / 2 + dx, y: (Double(H) - h) / 2 + dy, width: w, height: h))
}

/* Le sous-titre façon story : bandeau sombre translucide, texte blanc centré, au tiers bas. */
func sousTitre(_ cx: CGContext, _ texte: String, _ alpha: Double) {
  guard alpha > 0.01 else { return }
  let f = CTFontCreateWithName("HelveticaNeue-Bold" as CFString, 34, nil)
  let att = NSAttributedString(string: texte, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): f,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): BLANC])
  let cadre = CGRect(x: 60, y: 250, width: Double(W) - 120, height: 200)
  let fs = CTFramesetterCreateWithAttributedString(att)
  let taille = CTFramesetterSuggestFrameSizeWithConstraints(fs, CFRange(location: 0, length: 0), nil, cadre.size, nil)
  let boite = CGRect(x: (Double(W) - taille.width) / 2 - 18, y: 250 - 12, width: taille.width + 36, height: taille.height + 24)
  cx.saveGState(); cx.setAlpha(CGFloat(alpha))
  cx.setFillColor(CGColor(gray: 0, alpha: 0.6))
  cx.addPath(CGPath(roundedRect: boite, cornerWidth: 12, cornerHeight: 12, transform: nil)); cx.fillPath()
  let chemin = CGPath(rect: CGRect(x: (Double(W) - taille.width) / 2, y: 250, width: taille.width + 1, height: taille.height), transform: nil)
  let para = NSMutableParagraphStyle(); para.alignment = .center
  let att2 = NSMutableAttributedString(attributedString: att); att2.addAttribute(.paragraphStyle, value: para, range: NSRange(location: 0, length: att2.length))
  CTFrameDraw(CTFramesetterCreateFrame(CTFramesetterCreateWithAttributedString(att2), CFRange(location: 0, length: 0), chemin, nil), cx)
  cx.restoreGState()
}

func voile(_ cx: CGContext, _ a: Double) {
  guard a > 0.01 else { return }
  cx.saveGState(); cx.setAlpha(CGFloat(min(a, 1))); cx.setFillColor(BLANC); cx.fill(CGRect(x: 0, y: 0, width: W, height: H)); cx.restoreGState()
}

func cadre(_ cx: CGContext, _ t: Double) {
  cx.setFillColor(BLANC); cx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  guard let i = tl.plans.lastIndex(where: { $0.debut <= t }) else { return }
  let pl = tl.plans[i], u = t - pl.debut, d = max(pl.fin - pl.debut, 0.01), im = image(pl.image)
  switch pl.mouvement {
  case "calme": dessiner(cx, im, s: 1.02 + 0.04 * u / d)
  case "approche": dessiner(cx, im, s: 1.0 + 0.12 * lisse(u / d))
  case "recul": dessiner(cx, im, s: 1.12 - 0.1 * lisse(u / d))
  case "glisse": dessiner(cx, im, s: 1.08, dx: -24 + 48 * lisse(u / d))
  case "drop": dessiner(cx, im, s: 1.0 + 0.18 * exp(-u * 6), dx: 10 * exp(-u * 4) * sin(t * 47), dy: 10 * exp(-u * 4) * sin(t * 61))
  case "danse": dessiner(cx, im, s: 1.03 + pulse(t) * 2)
  case "fige": dessiner(cx, im, s: 1.06)
  case "final":
    dessiner(cx, im, s: 1.0 + 0.04 * lisse(u / d))
  default: dessiner(cx, im, s: 1.04)
  }
  // Le sous-titre entre en douceur et ne recouvre pas le break figé.
  if let tx = pl.texte, !tx.isEmpty { sousTitre(cx, tx, lisse(u / 0.12)) }
  // L'éclair du drop, et celui de chaque reprise du pas.
  if pl.mouvement == "drop" { voile(cx, max(0, 1 - u / 0.25)) }
  if pl.mouvement == "fige" { voile(cx, u < 0.08 ? 0.6 : 0) }
  // La fin : le logotype puis la vague signature sur le dernier coup.
  if pl.mouvement == "final" {
    let l = sortieDos((u - 0.3) / 0.35)
    if l > 0.01 { let lw = 230.0 * l, lh = lw * Double(logo.height) / Double(logo.width); cx.draw(logo, in: CGRect(x: 40, y: Double(H) - 60 - lh, width: lw, height: lh)) }
    let k = lisse((u - 0.8) / 0.4)
    if k > 0 { let vw = Double(W) * 1.5, vh = vw * Double(vague.height) / Double(vague.width); cx.draw(vague, in: CGRect(x: 0, y: -90 - (1 - k) * 320, width: vw, height: vh)) }  // en vertical, la vague s'élargit pour que la signature se lise
  }
}

let ecr = try AVAssetWriter(outputURL: videoSeule, fileType: .mp4)
let entree = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: Int(ProcessInfo.processInfo.environment["DEBIT"] ?? "") ?? 3_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
let adapt = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: entree, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
ecr.add(entree); ecr.startWriting(); ecr.startSession(atSourceTime: .zero)
let total = Int(tl.duree * Double(FPS))
let apercus: [Int: String] = [60: "v8-apercu-intro.jpg", 360: "v8-apercu-couplet.jpg", 690: "v8-apercu-drop.jpg", 760: "v8-apercu-pas.jpg", 1000: "v8-apercu-cour.jpg", Int(tl.duree * Double(FPS)) - 15: "v8-apercu-fin.jpg"]
for f in 0..<total {
  while !entree.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, adapt.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let cx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!),
                     space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue)!
  cadre(cx, Double(f) / Double(FPS))
  if let n = apercus[f], let img = cx.makeImage() {
    let dest = CGImageDestinationCreateWithURL(sortie.deletingLastPathComponent().appendingPathComponent(n) as CFURL, "public.jpeg" as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil); CGImageDestinationFinalize(dest)
  }
  CVPixelBufferUnlockBaseAddress(pb!, [])
  adapt.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: CMTimeScale(FPS)))
}
entree.markAsFinished()
let fini = DispatchSemaphore(value: 0); ecr.finishWriting { fini.signal() }; fini.wait()
precondition(ecr.status == .completed, "vidéo : \(String(describing: ecr.error))")

let compo = AVMutableComposition()
let plage = CMTimeRange(start: .zero, duration: CMTime(seconds: tl.duree, preferredTimescale: 600))
let sem = DispatchSemaphore(value: 0)
Task {
  // L'asset doit rester vivant tant qu'on lit sa piste : recréé à la volée, il est libéré avant l'insertion (-12780).
  let va = AVURLAsset(url: videoSeule); let vt = try await va.loadTracks(withMediaType: .video).first!
  let aa = AVURLAsset(url: sonURL); let at = try await aa.loadTracks(withMediaType: .audio).first!
  let cv = compo.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
  let ca = compo.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
  try cv.insertTimeRange(plage, of: vt, at: .zero)
  try ca.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(try await aa.load(.duration), plage.duration)), of: at, at: .zero)
  let ex = AVAssetExportSession(asset: compo, presetName: AVAssetExportPresetPassthrough)!
  ex.outputURL = sortie; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
  await ex.export()
  if ex.status != .completed { print("assemblage : \(String(describing: ex.error))") }
  sem.signal()
}
sem.wait()
try? FileManager.default.removeItem(at: videoSeule)
print("animatique : \(sortie.path)")
