plugins {
    kotlin("multiplatform") version "1.9.24"
    id("com.android.library") version "8.5.0"
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.24"
}

kotlin {
    android()
    jvm("desktop") // optional future
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        val ktorVersion = "2.3.10"
        val serializationVersion = "1.6.3"

        val commonMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-core:$ktorVersion")
                implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
                implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:$serializationVersion")
            }
        }
        val commonTest by getting
        val androidMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-okhttp:$ktorVersion")
            }
        }
        val iosMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-darwin:$ktorVersion")
            }
        }
    }
}

android {
    namespace = "gg.floof.shared"
    compileSdk = 34
    defaultConfig {
        minSdk = 24
    }
    sourceSets["main"].manifest.srcFile("src/androidMain/AndroidManifest.xml")
}


