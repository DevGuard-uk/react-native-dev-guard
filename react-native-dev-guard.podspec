require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-dev-guard"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"] || "https://github.com/DevGuard-uk/react-native-dev-guard"
  s.license      = package["license"] || "MIT"
  s.authors      = package["author"] || "DevGuard"

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => (package.dig("repository", "url") || "https://github.com/DevGuard-uk/react-native-dev-guard.git"), :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}", "cpp/**/*.{h,c,cpp}"

  s.dependency "React-Core"
end
