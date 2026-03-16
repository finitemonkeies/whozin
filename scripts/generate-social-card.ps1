Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

$width = 1200
$height = 630
$outputPath = Join-Path $PSScriptRoot "..\public\social-card.png"

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(120, 80)),
  (New-Object System.Drawing.Point(1080, 560)),
  ([System.Drawing.Color]::FromArgb(255, 9, 9, 11)),
  ([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
)
$graphics.FillRectangle($backgroundBrush, 0, 0, $width, $height)

$pinkGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(75, 219, 39, 119))
$purpleGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 147, 51, 234))
$blueGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 59, 130, 246))
$violetGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 168, 85, 247))
$graphics.FillEllipse($pinkGlow, 20, -60, 430, 330)
$graphics.FillEllipse($purpleGlow, 760, -80, 460, 340)
$graphics.FillEllipse($blueGlow, 900, 360, 260, 220)
$graphics.FillEllipse($violetGlow, -20, 430, 320, 220)

$outerPath = New-RoundedRectanglePath -X 68 -Y 68 -Width 1064 -Height 494 -Radius 36
$outerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 255, 255, 255))
$outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 255, 255, 255), 1)
$graphics.FillPath($outerBrush, $outerPath)
$graphics.DrawPath($outerPen, $outerPath)

$innerPath = New-RoundedRectanglePath -X 104 -Y 104 -Width 992 -Height 422 -Radius 30
$innerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 24, 24, 27))
$innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(18, 255, 255, 255), 1)
$graphics.FillPath($innerBrush, $innerPath)
$graphics.DrawPath($innerPen, $innerPath)

$gridPenStrong = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 255, 255, 255), 1)
$gridPenMid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(36, 255, 255, 255), 1)
$gridPenLight = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(24, 255, 255, 255), 1)
$graphics.DrawLine($gridPenStrong, 104, 222, 1096, 222)
$graphics.DrawLine($gridPenMid, 104, 304, 1096, 304)
$graphics.DrawLine($gridPenLight, 104, 386, 1096, 386)
$graphics.DrawLine($gridPenLight, 272, 104, 272, 526)

$shadowPath = New-RoundedRectanglePath -X 122 -Y 180 -Width 132 -Height 132 -Radius 32
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(68, 219, 39, 119))
$graphics.FillPath($shadowBrush, $shadowPath)

$tilePath = New-RoundedRectanglePath -X 122 -Y 162 -Width 132 -Height 132 -Radius 32
$tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(122, 162)),
  (New-Object System.Drawing.Point(254, 294)),
  ([System.Drawing.Color]::FromArgb(255, 236, 72, 153)),
  ([System.Drawing.Color]::FromArgb(255, 147, 51, 234))
)
$graphics.FillPath($tileBrush, $tilePath)

$boltBrush = [System.Drawing.Brushes]::White
$boltPoints = @(
  (New-Object System.Drawing.PointF(195, 188)),
  (New-Object System.Drawing.PointF(160, 229)),
  (New-Object System.Drawing.PointF(184, 229)),
  (New-Object System.Drawing.PointF(176, 268)),
  (New-Object System.Drawing.PointF(215, 222)),
  (New-Object System.Drawing.PointF(190, 222))
)
$graphics.FillPolygon($boltBrush, $boltPoints)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 50, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$chipFont = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$footerFont = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString("Whozin", $titleFont, [System.Drawing.Brushes]::White, 306, 168)
$subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 212, 212, 216))
$graphics.DrawString("See who's going before you go.", $subtitleFont, $subtitleBrush, 308, 252)

$chip1Path = New-RoundedRectanglePath -X 308 -Y 352 -Width 252 -Height 52 -Radius 26
$chip1Brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(308, 352)),
  (New-Object System.Drawing.Point(560, 404)),
  ([System.Drawing.Color]::FromArgb(255, 236, 72, 153)),
  ([System.Drawing.Color]::FromArgb(255, 147, 51, 234))
)
$graphics.FillPath($chip1Brush, $chip1Path)
$graphics.DrawString("Private by default", $chipFont, [System.Drawing.Brushes]::White, 345, 366)

$chipFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 255, 255, 255))
$chipStroke = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(26, 255, 255, 255), 1)

$chip2Path = New-RoundedRectanglePath -X 578 -Y 352 -Width 210 -Height 52 -Radius 26
$graphics.FillPath($chipFill, $chip2Path)
$graphics.DrawPath($chipStroke, $chip2Path)
$graphics.DrawString("Social proof", $chipFont, [System.Drawing.Brushes]::White, 612, 366)

$chip3Path = New-RoundedRectanglePath -X 806 -Y 352 -Width 192 -Height 52 -Radius 26
$graphics.FillPath($chipFill, $chip3Path)
$graphics.DrawPath($chipStroke, $chip3Path)
$graphics.DrawString("Nights out", $chipFont, [System.Drawing.Brushes]::White, 850, 366)

$footerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 161, 161, 170))
$graphics.DrawString("The private social layer for live events.", $footerFont, $footerBrush, 308, 445)

$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$footerBrush.Dispose()
$chipStroke.Dispose()
$chipFill.Dispose()
$chip1Brush.Dispose()
$footerFont.Dispose()
$chipFont.Dispose()
$subtitleFont.Dispose()
$titleFont.Dispose()
$tileBrush.Dispose()
$shadowBrush.Dispose()
$gridPenLight.Dispose()
$gridPenMid.Dispose()
$gridPenStrong.Dispose()
$innerPen.Dispose()
$innerBrush.Dispose()
$outerPen.Dispose()
$outerBrush.Dispose()
$violetGlow.Dispose()
$blueGlow.Dispose()
$purpleGlow.Dispose()
$pinkGlow.Dispose()
$backgroundBrush.Dispose()
$outerPath.Dispose()
$innerPath.Dispose()
$shadowPath.Dispose()
$tilePath.Dispose()
$chip1Path.Dispose()
$chip2Path.Dispose()
$chip3Path.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
