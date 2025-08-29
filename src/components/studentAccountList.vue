<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUnmount,
  onBeforeUpdate,
  computed,
  nextTick,
  onBeforeMount,
  inject,
} from "vue";
import "vant/lib/index.css"; // 确保引入样式
import cover3500Image from "../assets/3500_cover_2025.png";
import angryWolf from "./angryWolf.vue";
import missyou from "./missyou.vue";
import challengeConfirm from "./challengeConfirm.vue";
import threeStar from "./threeStar.vue";
import { useRouter } from "vue-router";
import loading from "./loading.vue";
import getPassive from "./getPassive.vue";
import bearWarmup from "./bearWarmup.vue";
import {
  showFailToast,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Divider,
  Toast,
  closeToast,
} from "vant";
// 主题路径
import chooseModelSrcGoatAndWolf from "../assets/choose.webp";
import chooseModelSrcGoatAndWolfReview from "../assets/review.png";
import chooseModelSrcBears from "../assets/Boonie Bears/choose.gif";
import chooseModelSrcBearsReview from "../assets/Boonie Bears/review.gif";
import reviewCompleteSrcGoatAndWolf from "../assets/review_complete.png";
import reviewFirstSrcGoatAndWolf from "../assets/swipeHelp2.webp";
import reviewFirstSrcGoatAndWolf2 from "../assets/sheep_3.gif";

import reviewCompleteSrcBears from "../assets/Boonie Bears/review_complete.png";
import reviewFirstSrcBears from "../assets/Boonie Bears/swipeHelp2.webp";
import reviewFirstSrcBears2 from "../assets/Boonie Bears/sheep_3.gif";

const flagTheme = inject("flagTheme");
const passive_magic = inject("passive_magic");
const srcTheme = ref("");

const isLoading = ref(false);
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const router = useRouter();
// 返回首页
const gobackHomepage = () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("expirationDate");
  sessionStorage.removeItem("missyouAnimationShown");
  sessionStorage.removeItem("shineThreeStarShown");
  localStorage.removeItem("theme_name");
  router.push({
    path: "/homepage",
  });
};

// 显示答案
const showAnswerSheet = ref(false);
const answerSheetList = ref([]);
const selfCheck = ref(true);
const toggleCheckSelf = () => {
  selfCheck.value = !selfCheck.value;
};

// 点击跳转明细
function showAnimationShineStartout() {
  if (startOutRef.value.visible) {
    startOutRef.value.hide();
  } else {
    startOutRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}
// 查找拼写
async function getSpellVocabulary(account_data_id) {
  // 获得spell_vocabulary

  let params = new URLSearchParams();
  params.append("method", "getSpellVocabulary");
  params.append("username", username.value);
  params.append("account_data_id", account_data_id);
  return await axios.post("words/", params).then((ret) => {
    return ret.data.spell_vocabulary_records;
  });
}
const lock_spell = ref(false);
const goToNextPage = (
  index,
  data,
  mode,
  reversd_number = 0,
  none_of_above = 0,
  type = 0,
  is_spell_number = 3
) => {
  // 删除并备份试题
  const shiti_backup = [];
  for (let i = data.synonyms.length - 1; i >= 0; i--) {
    const synonym = data.synonyms[i];
    if (synonym["排除"] === "试题" || synonym["排除"] === "手写") {
      // 备份
      shiti_backup.push({
        synonym: synonym,
        answer: data.answers[i],
      });
      // 删除对应的项
      data.synonyms.splice(i, 1);
      data.answers.splice(i, 1);
    }
  }

  console.log("处理后 data:", data);
  console.log("备份的 shiti_backup:", shiti_backup);

  // console.log("data", data);
  isInChooseMode.value = false;
  // 判断6个还是7个选项
  let numberOption;
  if (none_of_above && !checkedNoneOfAbove.value) {
    numberOption = 7;
  } else {
    numberOption = 6;
  }

  // 为真多选作准备
  const excludedChineseSet2 = new Set(
    data.synonyms
      .filter((s) => s.排除 === "无")
      .flatMap((s) => {
        const answerObj = data.answers.find((a) => a.英文 === s.英文);
        if (!answerObj) return [];
        return answerObj.中文.includes("；")
          ? answerObj.中文.split("；").map((w) => w.trim())
          : [answerObj.中文.trim()];
      })
  );
  // console.log("excludedChineseSet2:", excludedChineseSet2);

  let allChineseSet2 = new Set(
    data.answers
      .flatMap((answer) => {
        const chinese = answer?.中文;
        if (!chinese) return []; // 如果中文不存在，返回空数组

        // 按分号拆分并去除两端空格
        return chinese.split("；").map((word) => word.trim());
      })
      .filter(
        (word) =>
          word && // 过滤掉空字符串
          !excludedChineseSet2.has(word) // 检查是否在排除集中
      )
  );
  // console.log("allChineseSet2: ", allChineseSet2);

  function shuffle(array) {
    let currentIndex = array.length,
      temporaryValue,
      randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
  // 不拼接选项
  function processData2(data, numberOption) {
    // 1. 乱序 synonyms
    const shuffledSynonyms = shuffle([...data.synonyms]);

    // 生成排除词集合
    const excludedChineseSet = new Set(
      data.synonyms
        .filter((s) => s.排除 === "无")
        .flatMap((s) => {
          const answerObj = data.answers.find((a) => a.英文 === s.英文);
          if (!answerObj) return [];
          return answerObj.中文.includes("；")
            ? answerObj.中文.split("；").map((w) => w.trim())
            : [answerObj.中文.trim()];
        })
    );
    // console.log("excludedChineseSet:", excludedChineseSet);

    let allChineseSet = new Set(
      data.answers
        .flatMap((answer) => {
          const chinese = answer?.中文;
          if (!chinese) return []; // 如果中文不存在，返回空数组

          // 按分号拆分并去除两端空格
          return chinese.split("；").map((word) => word.trim());
        })
        .filter(
          (word) =>
            word && // 过滤掉空字符串
            !excludedChineseSet.has(word) // 检查是否在排除集中
        )
    );
    // console.log("allChineseSet: ", allChineseSet);

    // 遍历 synonyms
    shuffledSynonyms.forEach((synonym) => {
      // 获取正确答案
      const answerObj = data.answers.find((a) => a.英文 === synonym.英文);
      if (!answerObj) return;

      let correctChineseAnswers = answerObj.中文.includes("；")
        ? answerObj.中文.split("；").map((w) => w.trim())
        : [answerObj.中文.trim()];

      // 移除当前 synonym 的 `选项` 及其相关内容
      correctChineseAnswers.forEach((answer) => allChineseSet.delete(answer));
      if (synonym.选项) {
        allChineseSet.delete(synonym.选项.trim());
      }
      // console.log('correctChineseAnswers', correctChineseAnswers);
      // 处理带 ; 的选项
      if (synonym.选项) {
        // 拆分 ; 并移除每个部分
        synonym.选项.split("；").forEach((opt) => {
          const trimmedOpt = opt.trim();
          if (trimmedOpt) {
            allChineseSet.delete(trimmedOpt);
          }
        });
      }
      // // 构建当前 synonym 可用的选项
      // let finalOptions = new Set(correctChineseAnswers);
      // if (synonym.选项) {
      //   synonym.选项.split("；").forEach((option) => {
      //     const trimmedOption = option.trim();
      //     if (trimmedOption) {
      //       finalOptions.add(trimmedOption);
      //     }
      //   });
      // }

      // // 随机填充选项，确保 `选项` 不会错位
      // let remainingChinese = shuffle(Array.from(allChineseSet));
      // remainingChinese.forEach((word) => {
      //   if (finalOptions.size < numberOption) {
      //     finalOptions.add(word);
      //   }
      // });

      // 构建当前 synonym 可用的选项
      let finalOptions = new Set(correctChineseAnswers);

      // 计算还能添加多少个选项
      const remainingSlots = numberOption - finalOptions.size;

      // 只有在还有空位时才添加额外选项
      if (synonym.选项 && remainingSlots > 0) {
        const extraOptions = synonym.选项
          .split("；")
          .map((opt) => opt.trim())
          .filter((opt) => opt && !finalOptions.has(opt))
          .slice(0, remainingSlots); // 限制数量

        extraOptions.forEach((option) => {
          finalOptions.add(option);
        });
      }

      // 随机填充选项，确保不超过 numberOption
      let remainingChinese = shuffle(Array.from(allChineseSet));
      remainingChinese.forEach((word) => {
        if (finalOptions.size < numberOption) {
          finalOptions.add(word);
        }
      });

      // 最终乱序
      synonym.中文 = shuffle(Array.from(finalOptions));

      // 恢复correctChineseAnswers，但不恢复synonym.选项
      correctChineseAnswers.forEach((answer) => {
        if (!excludedChineseSet.has(answer)) {
          allChineseSet.add(answer);
        }
      });
    });

    // 重新调整 `answers` 顺序，使其与 `synonyms` 一致
    data.answers.sort((a, b) => {
      const indexA = shuffledSynonyms.findIndex((s) => s.英文 === a.英文);
      const indexB = shuffledSynonyms.findIndex((s) => s.英文 === b.英文);
      return indexA - indexB;
    });

    // 更新 `data.synonyms`
    data.synonyms = shuffledSynonyms;

    // 重新编号
    data.synonyms.forEach((item, index) => {
      item.序号 = index + 1;
    });
    data.answers.forEach((item, index) => {
      item.序号 = index + 1;
    });

    return data;
  }

  function processData(data, numberOption) {
    // Helper function to shuffle an array
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function generateDistractors(
      allChineseSet,
      num,
      correctChineseAnswers,
      allowCorrectAndIncorrectMix = false
    ) {
      const remainingChinese = Array.from(allChineseSet);
      const distractors = [];

      function getNonRepeatingPair() {
        let first, second;
        let attempts = 0;

        // Ensure first and second are not repeating with correctChineseAnswers
        while (attempts < remainingChinese.length) {
          const [candidateFirst, candidateSecond] = shuffle(
            remainingChinese.slice(0, 2)
          );

          if (
            !correctChineseAnswers.includes(candidateFirst) &&
            !correctChineseAnswers.includes(candidateSecond)
          ) {
            first = candidateFirst;
            second = candidateSecond;
            remainingChinese.splice(remainingChinese.indexOf(first), 1);
            remainingChinese.splice(remainingChinese.indexOf(second), 1);
            break;
          }
          attempts++;
        }

        return [first, second];
      }

      for (let i = 0; i < num; i++) {
        if (Math.random() < 0.2 && remainingChinese.length > 1) {
          const [first, second] = getNonRepeatingPair();
          if (first && second) {
            distractors.push(`${first},${second}`);
          }
        } else if (
          allowCorrectAndIncorrectMix &&
          Math.random() < 0.8 &&
          correctChineseAnswers.length > 0 &&
          remainingChinese.length > 0
        ) {
          const correctAnswer = correctChineseAnswers.pop();
          const incorrectAnswer = remainingChinese.shift();
          distractors.push(`${correctAnswer},${incorrectAnswer}`);
        } else {
          distractors.push(remainingChinese.shift());
        }
      }

      return shuffle(distractors);
    }

    const shuffledSynonyms = shuffle([...data.synonyms]);

    // Generate excluded words set
    const excludedChineseSet = new Set(
      data.synonyms
        .filter((s) => s.排除 === "无")
        .flatMap((s) => {
          const answerObj = data.answers.find((a) => a.英文 === s.英文);
          if (!answerObj) return [];
          return answerObj.中文.includes("；")
            ? answerObj.中文.split("；").map((w) => w.trim())
            : [answerObj.中文.trim()];
        })
    );
    console.log("excludedChineseSet: ", excludedChineseSet);

    // Collect all Chinese options excluding those marked "无"
    let allChineseSet = new Set(
      data.answers
        .flatMap((answer) => {
          const chinese = answer?.中文;
          if (!chinese) return []; // 如果中文不存在，返回空数组

          const splitWords = chinese.split("；").map((word) => word.trim());
          return splitWords;
        })
        .filter((word) => {
          const shouldKeep = word && !excludedChineseSet.has(word);
          return shouldKeep;
        })
    );

    data.synonyms.forEach((synonym) => {
      if (synonym.选项) {
        if (synonym.选项.includes("；")) {
          synonym.选项.split("；").forEach((opt) => {
            allChineseSet.delete(opt.trim());
          });
        } else {
          allChineseSet.delete(synonym.选项.trim());
        }
      }
    });

    shuffledSynonyms.forEach((synonym) => {
      const answerObj = data.answers.find((a) => a.英文 === synonym.英文);
      const correctChineseAnswers = answerObj.中文.includes("；")
        ? answerObj.中文.split("；")
        : [answerObj.中文];

      correctChineseAnswers.forEach((answer) => allChineseSet.delete(answer));
      // console.log("allChineseSet", allChineseSet);
      let mixedChinese;
      if (correctChineseAnswers.length === 5) {
        const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
        const randomOption = Math.random();
        if (randomOption < 0.33) {
          mixedChinese = shuffle([
            ...shuffledCorrectAnswers,
            ...generateDistractors(
              allChineseSet,
              numberOption - 5,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = shuffledCorrectAnswers.join("；");
        } else if (randomOption < 0.66) {
          const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
          const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]},${shuffledCorrectAnswers[4]}`;
          mixedChinese = shuffle([
            mergedAnswer1,
            mergedAnswer2,
            ...generateDistractors(
              allChineseSet,
              numberOption - 2,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}`;
        } else {
          const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
          const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]}`;
          mixedChinese = shuffle([
            mergedAnswer1,
            mergedAnswer2,
            shuffledCorrectAnswers[4],
            ...generateDistractors(
              allChineseSet,
              numberOption - 3,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}；${shuffledCorrectAnswers[4]}`;
        }
      } else if (correctChineseAnswers.length === 4) {
        const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
        const randomOption = Math.random();
        if (randomOption < 0.25) {
          mixedChinese = shuffle([
            ...shuffledCorrectAnswers,
            ...generateDistractors(
              allChineseSet,
              numberOption - 4,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = shuffledCorrectAnswers.join("；");
        } else if (randomOption < 0.5) {
          const mergedAnswer = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]},${shuffledCorrectAnswers[2]}`;
          mixedChinese = shuffle([
            mergedAnswer,
            shuffledCorrectAnswers[3],
            ...generateDistractors(
              allChineseSet,
              numberOption - 2,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[3]}`;
        } else if (randomOption < 0.75) {
          const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
          const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]}`;
          mixedChinese = shuffle([
            mergedAnswer1,
            mergedAnswer2,
            ...generateDistractors(
              allChineseSet,
              numberOption - 2,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}`;
        } else {
          const mergedAnswer = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
          mixedChinese = shuffle([
            mergedAnswer,
            shuffledCorrectAnswers[2],
            shuffledCorrectAnswers[3],
            ...generateDistractors(
              allChineseSet,
              numberOption - 3,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[2]}；${shuffledCorrectAnswers[3]}`;
        }
      } else if (correctChineseAnswers.length === 3) {
        const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
        if (Math.random() < 0.4) {
          const [first, second] = shuffle([
            shuffledCorrectAnswers[0],
            shuffledCorrectAnswers[1],
          ]);
          const mergedAnswer = `${first},${second}`;
          mixedChinese = shuffle([
            mergedAnswer,
            shuffledCorrectAnswers[2],
            ...generateDistractors(
              allChineseSet,
              numberOption - 2,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[2]}`;
        } else {
          mixedChinese = shuffle([
            ...shuffledCorrectAnswers,
            ...generateDistractors(
              allChineseSet,
              numberOption - 3,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = shuffledCorrectAnswers.join("；");
        }
      } else if (correctChineseAnswers.length === 2) {
        const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
        if (Math.random() < 0.2) {
          const [first, second] = shuffle([
            shuffledCorrectAnswers[0],
            shuffledCorrectAnswers[1],
          ]);
          const mergedAnswer = `${first},${second}`;
          mixedChinese = shuffle([
            mergedAnswer,
            ...generateDistractors(
              allChineseSet,
              numberOption - 1,
              correctChineseAnswers,
              true
            ),
          ]);
          answerObj.中文 = mergedAnswer;
        } else {
          mixedChinese = shuffle([
            ...shuffledCorrectAnswers,
            ...generateDistractors(
              allChineseSet,
              numberOption - 2,
              correctChineseAnswers
            ),
          ]);
          answerObj.中文 = shuffledCorrectAnswers.join("；");
        }
      } else {
        const remainingChinese = shuffle(Array.from(allChineseSet));
        mixedChinese = shuffle([
          ...correctChineseAnswers,
          ...generateDistractors(
            allChineseSet,
            numberOption - correctChineseAnswers.length,
            correctChineseAnswers,
            false
          ),
        ]);
      }

      mixedChinese = mixedChinese.filter((option) => option);
      while (mixedChinese.length < numberOption) {
        mixedChinese.push("无");
      }

      synonym.中文 = mixedChinese.slice(0, numberOption);

      correctChineseAnswers.forEach((answer) => {
        if (!excludedChineseSet.has(answer)) {
          allChineseSet.add(answer);
        }
      });
    });

    data.answers.sort((a, b) => {
      const indexA = shuffledSynonyms.findIndex((s) => s.英文 === a.英文);
      const indexB = shuffledSynonyms.findIndex((s) => s.英文 === b.英文);
      return indexA - indexB;
    });

    data.synonyms = shuffledSynonyms;

    data.synonyms.forEach((item, index) => {
      item.序号 = index + 1;
    });

    data.answers.forEach((item, index) => {
      item.序号 = index + 1;
    });

    return data;
  }

  if (data.merge_option) {
    console.log("processData");
    processData(data, numberOption);
  } else {
    console.log("processData2");
    processData2(data, numberOption);
  }
  console.log("data_pinjie: ", data);

  // 增加中译英选项
  function processData3(data, reversd_number, numberOption) {
    // reversd_number = 10
    // 创建 data 的深拷贝
    const originalData = JSON.parse(JSON.stringify(data));

    // 交换 data.answers 中的中文和英文，并处理分号分割
    const processedAnswers = data.answers.map((item) => {
      let chineseOptions;
      if (item["中文"].includes("；")) {
        chineseOptions = item["中文"].split("；");
      } else if (item["中文"].includes(",")) {
        chineseOptions = item["中文"].split(",");
      } else {
        chineseOptions = [item["中文"]];
      }

      const randomChinese =
        chineseOptions[Math.floor(Math.random() * chineseOptions.length)];

      return {
        序号: item["序号"],
        英文: randomChinese,
        中文: item["英文"],
      };
    });
    // console.log("processedAnswers: ", processedAnswers);

    // 获取所有英文答案
    const allChinese = processedAnswers.map((item) => item["英文"]);
    const allEnglish = processedAnswers.map((item) => item["中文"]);

    const processedSynonyms = data.synonyms.map((synonym) => {
      // 获取正确答案的中文
      const correctAnswer = processedAnswers.find(
        (answer) => answer["中文"] === synonym["英文"]
      );

      const correctChinese = correctAnswer.英文;
      // console.log('correctChinese: ', correctChinese);

      // 生成一个包含正确答案的随机中文列表
      const englishOptions = [correctAnswer.中文];
      const addedAnswers = new Set(englishOptions);
      while (englishOptions.length < numberOption) {
        if (addedAnswers.size >= allEnglish.length) {
          englishOptions.push("无"); // 用“无”代替
        } else {
          const randomAnswer =
            allEnglish[Math.floor(Math.random() * allEnglish.length)];
          // console.log("randomAnswer: ", randomAnswer);
          if (
            randomAnswer !== null &&
            randomAnswer !== "" &&
            !addedAnswers.has(randomAnswer)
          ) {
            // 获取新添加的中文对应的英文
            const randomAnswerEnglish = processedAnswers.find(
              (answer) => answer["中文"] === randomAnswer
            )?.英文;
            // console.log("randomAnswerEnglish: ", randomAnswerEnglish);

            const isDuplicate = englishOptions.some((existingChinese) => {
              const existingAnswerEnglish = processedAnswers.find(
                (answer) => answer["中文"] === existingChinese
              )?.英文;

              // Split the existing answer by '；' and check if it contains randomAnswerEnglish
              if (existingAnswerEnglish) {
                const splitExistingAnswers = existingAnswerEnglish.split("；");
                return splitExistingAnswers.includes(randomAnswerEnglish);
              }
              return false;
            });

            if (!isDuplicate) {
              englishOptions.push(randomAnswer);
              addedAnswers.add(randomAnswer);
            }
          }
        }
      }

      // 随机打乱数组顺序
      for (let i = englishOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [englishOptions[i], englishOptions[j]] = [
          englishOptions[j],
          englishOptions[i],
        ];
      }

      return {
        序号: synonym["序号"],
        英文: correctChinese,
        中文: englishOptions,
      };
    });

    // console.log("processedSynonyms: ", processedSynonyms);

    // 从 processedAnswers 和 processedSynonyms 中随机选取 reversd_number 个
    const selectedIndexes = new Set();
    while (selectedIndexes.size < reversd_number) {
      selectedIndexes.add(Math.floor(Math.random() * processedAnswers.length));
    }

    // console.log('selectedIndexes: ', selectedIndexes);

    const selectedAnswers = Array.from(selectedIndexes).map(
      (index) => processedAnswers[index]
    );
    // console.log('selectedAnswers: ', selectedAnswers);

    const selectedSynonyms = Array.from(selectedIndexes).map(
      (index) => processedSynonyms[index]
    );
    // console.log("selectedSynonyms: ", selectedSynonyms);

    // 在 originalData 中的 answers 和 synonyms 随机插入
    selectedAnswers.forEach((answer, index) => {
      const randomPosition = Math.floor(
        Math.random() * (originalData.answers.length + 1)
      );
      originalData.answers.splice(
        randomPosition,
        0,
        selectedAnswers.find((a) => a.序号 === answer.序号)
      );
      originalData.synonyms.splice(
        randomPosition,
        0,
        selectedSynonyms.find((s) => s.序号 === selectedSynonyms[index].序号)
      );
    });

    // 重新整理序号
    originalData.answers.forEach((item, index) => {
      item.序号 = index + 1;
    });
    originalData.synonyms.forEach((item, index) => {
      item.序号 = index + 1;
    });

    // 返回处理后的数据和原始数据
    return {
      processedData: { answers: processedAnswers, synonyms: processedSynonyms },
      NewData: originalData,
    };
  }

  let processedData, NewData;
  if (reversd_number > 0) {
    ({ processedData, NewData } = processData3(
      data,
      reversd_number,
      numberOption
    ));
    data = NewData;
  }

  console.log("data_zhongyiying: ", data);

  if (none_of_above && !checkedNoneOfAbove.value) {
    function replaceWithNoneOfTheAbove(data) {
      // console.log('data: ', data);
      const noneOfTheAbove = "以上都不对";

      // 保存替换前的正确答案
      const originalAnswers = data.answers.map((answer) => ({
        英文: answer.英文,
        中文: answer.中文,
      }));
      // console.log("originalAnswers: ", originalAnswers);

      data.synonyms.forEach((synonym) => {
        // 找到正确答案
        // console.log("synonym.英文", synonym.英文)
        let correctAnswer;
        let correctAnswerObj = data.answers.find(
          (answer) => answer.英文 === synonym.英文
        );

        if (!correctAnswerObj) {
          // 在没有找到对应答案的情况下，检查中文
          correctAnswerObj = data.answers.find((answer) => {
            // 检查中文是否包含分隔符
            if (answer.中文.includes("；")) {
              // 分割并逐个检查
              const options = answer.中文.split("；");
              return options.some((option) => option.trim() === synonym.英文);
            }
            return answer.中文 === synonym.英文;
          });
          // console.log('correctAnswerObj2: ', correctAnswerObj);
        }

        if (correctAnswerObj) {
          correctAnswer = correctAnswerObj.中文;
        }
        // else {
        //   correctAnswer = '未找到匹配项';
        // }
        // console.log('correctAnswerObj: ', correctAnswerObj);

        // 解析正确答案为数组
        const correctAnswers = correctAnswer.includes("；")
          ? correctAnswer.split("；")
          : [correctAnswer];

        // 决定是否替换正确答案，概率在10%-20%之间
        let replaceCorrectAnswer = false;
        if (Math.random() < 0.14) {
          // if (Math.random() < 1) {
          replaceCorrectAnswer = true;
        }

        let flattext = 0;
        if (correctAnswerObj.英文 === "make use of") {
          // if (Math.random() < 0) {
          replaceCorrectAnswer = true;
          flattext = 1;
        }

        if (replaceCorrectAnswer) {
          // 替换所有正确答案
          synonym.中文 = synonym.中文.map((option) =>
            correctAnswers.includes(option) ? noneOfTheAbove : option
          );
          correctAnswerObj.中文 = noneOfTheAbove;
        } else {
          // 处理选项数组
          const optionsArray = synonym.选项 ? synonym.选项.split("；") : [];
          // 替换一个错误答案
          let replaced = false;

          // 优先替换不在 correctAnswers 和 optionsArray 中的内容
          for (let i = 0; i < synonym.中文.length; i++) {
            if (
              !correctAnswers.includes(synonym.中文[i]) && // 不在正确答案中
              !optionsArray.includes(synonym.中文[i]) && // 不在选项数组中
              synonym.中文[i] !== null
            ) {
              synonym.中文[i] = noneOfTheAbove;
              replaced = true;
              break;
            }
          }
          // 如果没有替换成功，随机替换一个在 optionsArray 中的内容
          if (!replaced) {
            const possibleIndices = [];

            // 收集在 optionsArray 中的内容的索引
            for (let i = 0; i < synonym.中文.length; i++) {
              if (
                optionsArray.includes(synonym.中文[i]) &&
                synonym.中文[i] !== null
              ) {
                possibleIndices.push(i);
              }
            }

            // 如果有可替换的索引，从中随机选择一个进行替换
            if (possibleIndices.length > 0) {
              const randomIndex =
                possibleIndices[
                  Math.floor(Math.random() * possibleIndices.length)
                ];
              synonym.中文[randomIndex] = noneOfTheAbove;
              replaced = true;
            }
          }

          // 如果所有内容都是正确答案或 synonym.选项中的内容，并且没有成功替换
          if (!replaced) {
            // 随机替换一个内容
            const randomIndex = Math.floor(Math.random() * synonym.中文.length);
            synonym.中文[randomIndex] = noneOfTheAbove;
          }
        }

        // 确保“以上都不对”在列表最后一个位置
        synonym.中文 = synonym.中文
          .filter((option) => option !== noneOfTheAbove)
          .concat(noneOfTheAbove);

        while (synonym.中文.length < 7) {
          let randomAnswer = null;

          // 循环直到找到一个中文字符
          do {
            randomAnswer =
              originalAnswers[
                Math.floor(Math.random() * originalAnswers.length)
              ].中文;
          } while (randomAnswer && randomAnswer.charCodeAt(0) <= 255);

          // 检查随机答案是否在当前数组中且不为 null
          if (!synonym.中文.includes(randomAnswer) && randomAnswer !== null) {
            synonym.中文.splice(synonym.中文.length - 1, 0, randomAnswer);
          }
        }
      });

      // 更新 answers 数组并添加 "正确答案" 字段
      data.answers.forEach((answer) => {
        if (answer.中文 === noneOfTheAbove) {
          // 找到替换前的正确答案
          const originalCorrectAnswer = originalAnswers.find(
            (original) => original.英文 === answer.英文
          ).中文;
          answer.正确答案 = originalCorrectAnswer;
        } else {
          answer.正确答案 = answer.中文;
        }
      });

      return data;
    }

    data = replaceWithNoneOfTheAbove(data);
  }

  // 去掉可能的；
  function replaceSemicolon(data) {
    let isUpdated = false;

    // 深拷贝 data，以防止直接修改原数据
    const newData = JSON.parse(JSON.stringify(data));

    newData.synonyms.forEach((synonym) => {
      synonym.中文 = synonym.中文.map((item) => {
        if (item.includes("；")) {
          // console.log("item", item);
          isUpdated = true;
          return item.replace(/；/g, ",");
        }
        return item;
      });
    });

    return isUpdated ? newData : data;
  }
  data = replaceSemicolon(data);

  const newTabsName = ["全部", ...tabsName.value];
  const isRewardEligible = data["progressPercentage"] !== 100;
  // console.log("type", type);
  const autoplay2 = type === 1 ? 10000 : 8000;

  function redirect() {
    function getStatusMessage(checkedSpell, checkedNoneOfAbove) {
      if (checkedSpell && checkedNoneOfAbove) {
        return "拼写和以上都不对关闭，消费2💎";
      } else if (checkedSpell) {
        return "拼写关闭，提交后消费1💎";
      } else if (checkedNoneOfAbove) {
        return "以上都不对关闭，提交后消费1💎";
      } else {
        return "";
      }
    }

    if (mode == 0) {
      const message = getStatusMessage(
        checkedSpell.value,
        checkedNoneOfAbove.value
      );
      if (message) {
        showToast({
          duration: 3000,
          closeOnClick: true,
          closeOnClickOverlay: true,
          message: message,
        });
      }
      router.push({
        path: "/studentAccountItem",
        state: {
          data: JSON.stringify(data),
          nid: originalData.value[index].nid,
          title: data["title"],
          type: data["type"],
          username: data["username"],
          usercoins: usercoins.value,
          isRewardEligible: isRewardEligible,
          lock_spell: lock_spell.value,
          checkedNoneOfAbove: checkedNoneOfAbove.value,
          checkedSpell: checkedSpell.value,
          RateOrigin: data["rate"],
        },
      });
    }
    if (mode == 1) {
      const message = getStatusMessage(
        checkedSpell.value,
        checkedNoneOfAbove.value
      );
      if (message) {
        showToast({
          duration: 3000,
          closeOnClick: true,
          closeOnClickOverlay: true,
          message: message,
        });
      }
      // console.log('data', data);
      // console.log('nid', originalData.value[index].nid);
      // console.log('title', data["title"]);
      // console.log('type', data["type"]);
      // console.log('username', data["username"]);
      // console.log('usercoins', usercoins.value);
      // console.log('isRewardEligible', isRewardEligible);
      // console.log('autoplay2', autoplay2);
      // console.log('lock_spell', lock_spell.value);
      router.push({
        path: "/studentAccountSwipe",
        state: {
          data: JSON.stringify(data),
          nid: originalData.value[index].nid,
          title: data["title"],
          type: data["type"],
          username: data["username"],
          usercoins: usercoins.value,
          isRewardEligible: isRewardEligible,
          autoplay2: autoplay2,
          lock_spell: lock_spell.value,
          checkedNoneOfAbove: checkedNoneOfAbove.value,
          checkedSpell: checkedSpell.value,
          RateOrigin: data["rate"],
        },
      });
    }
    if (mode == 2) {
      sessionStorage.setItem("testFreshFlag", false);
      router.push({
        path: "/studentAccountTest",
        state: {
          checkedNoneOfAbove: checkedNoneOfAbove.value,
          checkedSpell: checkedSpell.value,
          data: JSON.stringify(data),
          nid: originalData.value[index].nid,
          title: data["title"],
          type: data["type"],
          username: data["username"],
          usercoins: usercoins.value,
          isRewardEligible: isRewardEligible,
          lock_spell: lock_spell.value,
        },
      });
    }
    if (mode == 4) {
      const message = getStatusMessage(
        checkedSpell.value,
        checkedNoneOfAbove.value
      );
      if (message) {
        showToast({
          duration: 3000,
          closeOnClick: true,
          closeOnClickOverlay: true,
          message: message,
        });
      }
      router.push({
        path: "/studentAccountChallenge",
        state: {
          data: JSON.stringify(data),
          nid: originalData.value[index].nid,
          title: data["title"],
          type: data["type"],
          username: data["username"],
          usercoins: usercoins.value,
          isRewardEligible: isRewardEligible,
          autoplay2: autoplay2,
          lock_spell: lock_spell.value,
          checkedNoneOfAbove: checkedNoneOfAbove.value,
          checkedSpell: checkedSpell.value,
          RateOrigin: data["rate"],
        },
      });
    }
  }

  function getZhenduoxuan(data) {
    // 如果没有none_of_above, 添加正确答案
    if (!data.answers.every((answer) => "正确答案" in answer)) {
      data.answers.forEach((answer) => {
        if (!("正确答案" in answer)) {
          answer.正确答案 = answer.中文;
        }
      });
    }

    if (data.merge_option) {
      // 有拼接
      data.answers.forEach((answer, index) => {
        // 只有当 answer.中文 不为 "以上都不对"，且 answer.正确答案 中包含 "；" 时才处理
        if (
          (answer.中文 !== "以上都不对" &&
            answer.正确答案 &&
            answer.正确答案.includes("；")) ||
          (answer.中文 !== "以上都不对" && answer.中文.includes("；"))
        ) {
          // 同时处理中文分号和英文逗号作为分隔符的情况
          let parts = answer.中文
            .split(/[；,]/g)
            .map((s) => s.trim())
            .filter((s) => s);

          // 根据 parts 的数量随机确定 numToRemove（删除0个概率0.3，1个的概率0.3，2个的概率0.4）
          let probabilities = {
            2: [0.3, 0.7],
            // 3: [0.3, 0.3, 0.4],
            3: [0, 1, 0],
            4: [0.2, 0.2, 0.2, 0.4],
            5: [0.15, 0.15, 0.15, 0.15, 0.4],
          };
          let distribution = probabilities[parts.length] || [1]; // 默认为 100% 选择 0
          let randomValue = Math.random();
          let cumulative = 0;
          let numToRemove = 0;

          for (let i = 0; i < distribution.length; i++) {
            cumulative += distribution[i];
            if (randomValue < cumulative) {
              numToRemove = i;
              break;
            }
          }
          numToRemove = Math.min(numToRemove, parts.length);

          // 随机删除 numToRemove 个部分
          for (let i = 0; i < numToRemove; i++) {
            if (parts.length === 0) break;
            let removeIndex = Math.floor(Math.random() * parts.length); // 随机删除的索引
            let removed = parts.splice(removeIndex, 1)[0]; // 随机删除的元素存储到removed
            console.log("removed: ", removed);

            // 使用相同的索引，在 data.synonyms 中找到对应的项
            let synonymItem = data.synonyms[index];
            // console.log('synonymItem: ', synonymItem);
            if (synonymItem) {
              // 找到 removed 在 synonyms 里对应的索引（比对时去除首尾空格）
              let synonymIndex = synonymItem.中文.findIndex(
                (item) => item.trim() === removed
              );
              if (synonymIndex !== -1) {
                let correctAnswers = answer.正确答案
                  .split("；")
                  .map((s) => s.trim());
                // 筛选出可用的替换项：allChineseSet2 中不包含当前 synonyms 里的中文
                let availableOptions = [...allChineseSet2]
                  .flatMap((ch) =>
                    /[,；]/.test(ch) // 检查是否包含英文逗号或中文分号
                      ? ch.split(/[,；]/).map((item) => item.trim()) // 按逗号或分号拆分，并去掉空格
                      : [ch]
                  )
                  .filter(
                    (ch) =>
                      !synonymItem.中文.some((item) =>
                        /[,；]/.test(item)
                          ? item
                              .split(/[,；]/)
                              .map((i) => i.trim())
                              .includes(ch)
                          : item.trim() === ch
                      ) &&
                      // 新增条件：不与正确答案重复
                      !correctAnswers.includes(ch.trim())
                  );

                // 替换答案
                // 更新答案的中文字段，将处理后的数组重新用 "；" 连接
                if (answer.英文 == "for + 时间段") {
                  console.log(
                    "synonymItem.中文[synonymIndex]",
                    synonymItem.中文[synonymIndex]
                  );
                  console.log("answer.中文", answer.中文);
                  console.log("-------------------");
                }
                // answer.中文 = parts.join("；");

                // const regex = new RegExp(
                //   `[；,]?\\s*${synonymItem.中文[synonymIndex]}`,
                //   "g"
                // );
                function escapeRegExp(string) {
                  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                }

                const rawKeyword = synonymItem.中文[synonymIndex];
                const keyword = escapeRegExp(rawKeyword);
                // const regex = new RegExp(`[；,]?\\s*${keyword}`, "g");
                const regex = new RegExp(
                  `(?:^|[；,]\\s*)${keyword}(?=\\s*[；,]|$)`,
                  "g"
                );
                answer.中文 = answer.中文.replace(regex, "");

                // 清理可能遗留的多余分隔符
                answer.中文 = answer.中文
                  .replace(/^[；,]\s*|\s*[；,]$/g, "")
                  .replace(/[；,]\s*[；,]/g, "；");

                if (answer.英文 == "for + 时间段") {
                  console.log("answer.中文2", answer.中文);
                }

                if (availableOptions.length > 0) {
                  let randomReplacement =
                    availableOptions[
                      Math.floor(Math.random() * availableOptions.length)
                    ];
                  console.log("randomReplacement", randomReplacement);
                  console.log("------------------------------------");
                  synonymItem.中文[synonymIndex] = randomReplacement;
                }
              }
            }
          }
        }
      });
    } else {
      // 无拼接
      // console.log(111111111)
      data.answers.forEach((answer, index) => {
        // 只有当 answer.中文 不为 "以上都不对"，且 answer.正确答案 中包含 "；" 时才处理
        if (
          answer.中文 !== "以上都不对" &&
          answer.正确答案 &&
          answer.正确答案.includes("；")
        ) {
          // 以 "；" 拆分中文字段，并去除首尾空格
          let parts = answer.中文.split("；").map((s) => s.trim());

          // 根据 parts 的数量随机确定 numToRemove （删除0个概率0.3，1个的概率0.3，2个的概率0.4）
          let probabilities = {
            2: [0.3, 0.7],
            3: [0.3, 0.3, 0.4],
            // 3: [0, 1, 0],
            4: [0.2, 0.2, 0.2, 0.4],
            5: [0.15, 0.15, 0.15, 0.15, 0.4],
          };
          let distribution = probabilities[parts.length] || [1]; // 默认为 100% 选择 0
          let randomValue = Math.random();
          let cumulative = 0;
          let numToRemove = 0;

          for (let i = 0; i < distribution.length; i++) {
            cumulative += distribution[i];
            if (randomValue < cumulative) {
              numToRemove = i;
              break;
            }
          }
          numToRemove = Math.min(numToRemove, parts.length);

          // 随机删除 numToRemove 个部分
          for (let i = 0; i < numToRemove; i++) {
            if (parts.length === 0) break;
            let removeIndex = Math.floor(Math.random() * parts.length);
            let removed = parts.splice(removeIndex, 1)[0];
            console.log("removed: ", removed);

            // 使用相同的索引，在 data.synonyms 中找到对应的项
            let synonymItem = data.synonyms[index];
            if (synonymItem) {
              // 找到 removed 在 synonyms 里对应的索引（比对时去除首尾空格）
              let synonymIndex = synonymItem.中文.findIndex(
                (item) => item.trim() === removed
              );
              if (synonymIndex !== -1) {
                let correctAnswers = answer.正确答案
                  .split("；")
                  .map((s) => s.trim());
                // 筛选出可用的替换项：allChineseSet2 中不包含当前 synonyms 里的中文和不与正确答案重复
                let availableOptions = [...allChineseSet2].filter(
                  (ch) =>
                    !synonymItem.中文.includes(ch) &&
                    !correctAnswers.includes(ch.trim())
                );
                if (availableOptions.length > 0) {
                  let randomReplacement =
                    availableOptions[
                      Math.floor(Math.random() * availableOptions.length)
                    ];
                  console.log("randomReplacement", randomReplacement);
                  console.log("------------------------------------");
                  synonymItem.中文[synonymIndex] = randomReplacement;
                }
              }
            }
          }

          // 更新答案的中文字段，将处理后的数组重新用 "；" 连接
          answer.中文 = parts.join("；");
        }
      });
    }
    return data;
  }

  function shuffleArray(arr) {
    const newArr = arr.slice(); // 拷贝一份数组
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }
  function insertBackupIntoData(data, shiti_backup) {
    // 随机插入
    shiti_backup.forEach((item) => {
      const insertIndex = Math.floor(
        Math.random() * (data.synonyms.length + 1)
      );

      // 处理中文字段
      if (Array.isArray(item.synonym.中文)) {
        const shuffled = shuffleArray(item.synonym.中文);
        shuffled.push("无"); // 添加第七项
        item.synonym.中文 = shuffled;
      }

      // 插入到对应位置
      data.synonyms.splice(insertIndex, 0, item.synonym);
      data.answers.splice(insertIndex, 0, item.answer);
    });

    // 重新编号
    for (let i = 0; i < data.synonyms.length; i++) {
      const newIndex = i + 1;
      if (data.synonyms[i].hasOwnProperty("序号")) {
        data.synonyms[i]["序号"] = newIndex;
      }
      if (
        typeof data.answers[i] === "object" &&
        data.answers[i] !== null &&
        data.answers[i].hasOwnProperty("序号")
      ) {
        data.answers[i]["序号"] = newIndex;
      }
      if (data.synonyms[i]["排除"] === "试题") {
        data.answers[i]["正确答案"] = data.answers[i]["中文"];
      }
    }
  }

  // 是否增加拼写
  if (none_of_above && is_spell_number > 0 && !checkedSpell.value) {
    // 有拼写
    getSpellVocabulary(data["nid"])
      .then((res) => {
        // console.log('res: ', res);
        return res.flatMap((item) => {
          lock_spell.value = Boolean(
            item["lock_spell"] === "true" ||
              item["lock_spell"] === true ||
              item["lock_spell"] === 1
          );
          // console.log('item: ', item["data_words"]);
          let dataString = item["data_words"]
            .replace(/(\W)'|'(\W)/g, '$1"$2')
            .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
          return JSON.parse(dataString);
        });
      })
      .then((spell_vocabulary_list) => {
        if (spell_vocabulary_list.length > is_spell_number) {
          // 随机选择 is_spell_number 个元素
          const shuffled = spell_vocabulary_list.sort(
            () => 0.5 - Math.random()
          );
          spell_vocabulary_list = shuffled.slice(0, is_spell_number);
        }
        // console.log("spell_vocabulary_list", spell_vocabulary_list);
        // 更新 data.synonyms
        data.synonyms.forEach((synonym) => {
          synonym.is_spell = false;
          spell_vocabulary_list.forEach((spellItem) => {
            if (spellItem["英文"] === synonym["英文"]) {
              synonym["中文"] = spellItem["中文"];
              const getRandomEnglish = (englishText, correctAnswer) => {
                // 如果答案是“以上都不对”，返回“正确答案”
                if (englishText === "以上都不对") {
                  // 如果正确答案中包含“；”，随机选择一个结果
                  if (correctAnswer.includes("；")) {
                    const options = correctAnswer.split("；");
                    const randomIndex = Math.floor(
                      Math.random() * options.length
                    );
                    return options[randomIndex];
                  } else {
                    // 不包含“；”，返回完整的正确答案
                    return correctAnswer;
                  }
                } else {
                  // 原有逻辑：处理包含 "；" 的情况，随机选择一个结果
                  if (englishText.includes("；")) {
                    const options = englishText.split("；");
                    const randomIndex = Math.floor(
                      Math.random() * options.length
                    );
                    return options[randomIndex];
                  } else {
                    // 不包含 "；"，返回原始字符串
                    return englishText;
                  }
                }
              };

              synonym["英文"] = getRandomEnglish(
                spellItem["答案"],
                spellItem["正确答案"]
              );
              synonym.is_spell = true;
            }
          });
        });
        return data;
      })
      .then((data) => {
        // 分组处理
        function replaceOptionInSynonyms(data) {
          // 获取所有 "正确答案" 列表
          const correctAnswersMap = data.answers.reduce((map, answer) => {
            map[answer.英文] = answer.中文; // 构建 英文 -> 中文 的映射
            return map;
          }, {});

          // 遍历每个 synonym 项
          data.synonyms.forEach((synonym) => {
            // 检查是否存在 "选项" 字段，如果不存在则跳过
            if (!synonym.hasOwnProperty("选项")) {
              // console.log("跳过没有“选项”字段的项: ", synonym);
              return; // 跳过当前循环，继续下一个
            }

            // 检查 "is_spell" 字段，如果为 true，则跳过
            if (synonym.is_spell === true) {
              // console.log("跳过 is_spell 为 true 的项: ", synonym);
              return; // 跳过当前循环，继续下一个
            }

            const option = synonym["选项"];

            // 检查 "选项" 不为 "" 且不为 undefined
            if (option !== "" && option !== undefined) {
              // console.log('option', option);
              const correctAnswer = correctAnswersMap[synonym["英文"]]; // 获取对应的正确答案
              const correctAnswerArray = correctAnswer.includes("；")
                ? correctAnswer.split("；")
                : [correctAnswer];
              // console.log('synonym["英文"]: ', synonym["英文"]);
              // console.log('correctAnswer: ', correctAnswer);
              let availableIndices = [];

              // 收集可以替换的索引（不包括“以上都不对”和“正确答案”）
              synonym["中文"].forEach((item, index) => {
                if (
                  item !== "以上都不对" &&
                  !correctAnswerArray.includes(item)
                ) {
                  availableIndices.push(index);
                }
              });

              if (availableIndices.length > 0) {
                // 如果选项包含 "/", 则拆分成多个选项
                const options = option.includes("；")
                  ? option.split("；")
                  : [option];

                // 替换多个选项
                options.forEach((opt) => {
                  // 如果选项已经存在于 "中文" 数组中，跳过
                  if (synonym["中文"].includes(opt)) {
                    // console.log(`选项“${opt}”已经存在，跳过`);
                    return; // 跳过此选项，继续下一个
                  }

                  if (availableIndices.length > 0) {
                    const randomIndex =
                      availableIndices[
                        Math.floor(Math.random() * availableIndices.length)
                      ];
                    // console.log(
                    //   `在位置 ${randomIndex} 处替换“${synonym["中文"][randomIndex]}”为“${opt}”`
                    // );
                    synonym["中文"][randomIndex] = opt; // 随机位置替换选项内容

                    // 替换后移除已使用的索引
                    availableIndices = availableIndices.filter(
                      (index) => index !== randomIndex
                    );
                  }
                });
              }
            }
          });

          return data;
        }
        data = replaceOptionInSynonyms(data);

        return data;
      })
      .then((data) => {
        data = getZhenduoxuan(data);

        data.answers.forEach((item) => {
          if (item.英文 === "for + 时间段") {
            console.log("for + 时间段");
            console.log("答案", item.中文);
            console.log("正确答案", item.正确答案);
          }
        });
        data.synonyms.forEach((item) => {
          if (item.英文 === "for + 时间段") {
            console.log("中文", item.中文);
          }
        });
        return data;
      })
      .then((data) => {
        // 放回试题
        if (shiti_backup.length > 0) {
          insertBackupIntoData(data, shiti_backup);
        }
        console.log("data_youpinxie: ", data);
        redirect();
      });
  } else {
    // 无拼写

    function replaceOptionInSynonyms(data) {
      // 获取所有 "正确答案" 列表
      const correctAnswersMap = data.answers.reduce((map, answer) => {
        map[answer.英文] = answer.中文; // 构建 英文 -> 中文 的映射
        return map;
      }, {});

      // 遍历每个 synonym 项
      data.synonyms.forEach((synonym) => {
        // 检查是否存在 "选项" 字段，如果不存在则跳过
        if (!synonym.hasOwnProperty("选项")) {
          // console.log("跳过没有“选项”字段的项: ", synonym);
          return; // 跳过当前循环，继续下一个
        }

        // 检查 "is_spell" 字段，如果为 true，则跳过
        if (synonym.is_spell === true) {
          // console.log("跳过 is_spell 为 true 的项: ", synonym);
          return; // 跳过当前循环，继续下一个
        }

        const option = synonym["选项"];

        // 检查 "选项" 不为 "" 且不为 undefined
        if (option !== "" && option !== undefined) {
          const correctAnswer = correctAnswersMap[synonym["英文"]]; // 获取对应的正确答案
          const correctAnswerArray = correctAnswer.includes("；")
            ? correctAnswer.split("；")
            : [correctAnswer];
          // console.log('synonym["英文"]: ', synonym["英文"]);
          // console.log('correctAnswer: ', correctAnswer);
          let availableIndices = [];

          // 收集可以替换的索引（不包括“以上都不对”和“正确答案”）
          synonym["中文"].forEach((item, index) => {
            if (item !== "以上都不对" && !correctAnswerArray.includes(item)) {
              availableIndices.push(index);
            }
          });

          if (availableIndices.length > 0) {
            // 如果选项包含 "/", 则拆分成多个选项
            const options = option.includes("；")
              ? option.split("；")
              : [option];

            // 替换多个选项
            options.forEach((opt) => {
              // 如果选项已经存在于 "中文" 数组中，跳过
              if (synonym["中文"].includes(opt)) {
                // console.log(`选项“${opt}”已经存在，跳过`);
                return; // 跳过此选项，继续下一个
              }

              if (availableIndices.length > 0) {
                const randomIndex =
                  availableIndices[
                    Math.floor(Math.random() * availableIndices.length)
                  ];
                // console.log(
                //   `在位置 ${randomIndex} 处替换“${synonym["中文"][randomIndex]}”为“${opt}”`
                // );
                synonym["中文"][randomIndex] = opt; // 随机位置替换选项内容

                // 替换后移除已使用的索引
                availableIndices = availableIndices.filter(
                  (index) => index !== randomIndex
                );
              }
            });
          }
        }
      });

      return data;
    }

    data = replaceOptionInSynonyms(data);

    data = getZhenduoxuan(data);
    data.answers.forEach((item) => {
      if (item.英文 === "for + 时间段") {
        console.log("for + 时间段");
        console.log("答案", item.中文);
        console.log("正确答案", item.正确答案);
      }
    });
    data.synonyms.forEach((item) => {
      if (item.英文 === "for + 时间段") {
        // console.log("中文", item.中文);
        console.log("---");
        item.中文.forEach((item2) => {
          console.log(item2);
        });
      }
    });
    // 放回试题
    if (shiti_backup.length > 0) {
      insertBackupIntoData(data, shiti_backup);
    }
    console.log("data_wupinxie: ", data);
    redirect();
  }
};

const speakWord = async (english, answer) => {
  // // speachweb
  // try {
  //   let utterance;
  //   if (!/[a-zA-Z]/.test(english)) {
  //     utterance = new SpeechSynthesisUtterance(answer);
  //   } else {
  //     utterance = new SpeechSynthesisUtterance(english);
  //   }

  //   utterance.lang = "en-US";
  //   utterance.pitch = 0.5
  //   window.speechSynthesis.speak(utterance);
  // } catch (error) {
  //   showToast("此浏览器不支持发音，请更换chrome或edge");
  // }

  // youdao fayin

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    english
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    console.log("Fallback to SpeechSynthesis");
    let utterance;
    if (!/[a-zA-Z]/.test(english)) {
      utterance = new SpeechSynthesisUtterance(answer);
    } else {
      utterance = new SpeechSynthesisUtterance(english);
    }

    utterance.lang = "en-US";
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);
  });

  // // baidu api
  // // 生成唯一的cuid（随机字符串 + 时间戳）
  // const cuid = 'web_' + Math.random().toString(36).substr(2, 8) + '_' + Date.now();

  // // 获取AccessToken
  // const tokenResponse = await fetch(
  //   `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=UfBjAfe60n05PzmcsKcAT23m&client_secret=I5Dvzi9cfKODgakI3FDf4xbruPITaLVh`
  // );

  // const tokenData = await tokenResponse.json();
  // const accessToken = tokenData.access_token;

  // // 调用语音合成API（注意：将lan参数改为'en'以支持英文发音）
  // const ttsResponse = await fetch(
  //   `https://tsn.baidu.com/text2audio?tex=${encodeURIComponent(english)}&tok=${accessToken}&cuid=${cuid}&ctp=1&lan=en&per=0`,
  //   { responseType: 'arraybuffer' }
  // );

  // const audioBlob = await ttsResponse.blob();
  // const audioUrl = URL.createObjectURL(audioBlob);
  // const audio = new Audio(audioUrl);
  // audio.play();
};

// 跳转下一面
const showChooseMode = ref(false);
const difficultyCoefficient = ref(30);
const showChooseTestMode = ref(false);
const showCheckAnswerSheet = ref(false);
const gotoIndex = ref("");
const gotoData = ref("");
const progressColor = computed(() => {
  if (difficultyCoefficient.value >= 100) {
    difficultyCoefficient.value = 100;
  }
  if (difficultyCoefficient.value <= 30) {
    return "#90ee90"; // 浅绿色
  } else if (
    difficultyCoefficient.value > 30 &&
    difficultyCoefficient.value <= 49
  ) {
    return "#87CEFA"; // 蓝色
  } else if (
    difficultyCoefficient.value >= 50 &&
    difficultyCoefficient.value <= 69
  ) {
    return "#ff7f7f"; // 浅红色
  } else if (
    difficultyCoefficient.value >= 70 &&
    difficultyCoefficient.value <= 100
  ) {
    return "#ee0a24"; // 红色
  }
  return "#000000"; // 默认颜色
});
const isRegularModeEnabled = ref(true);
const confirmButtonText = ref("普通模式");
const handleRegularMode = () => {
  if (originalData.value[gotoIndex.value]["type"] == 0) {
    // console.log("普通模式");
    goToNextPage(
      gotoIndex.value,
      gotoData.value,
      0,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"]
    );
  }

  if (originalData.value[gotoIndex.value]["type"] == 2) {
    goToNextPage(
      gotoIndex.value,
      gotoData.value,
      2,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"]
    );
  }

  if (originalData.value[gotoIndex.value]["type"] == 1) {
    goToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"]
    );
  }
};
const handleSwipeMode = () => {
  if (originalData.value[gotoIndex.value]["type"] == 1) {
    goToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      1,
      originalData.value[gotoIndex.value]["is_spell_number"]
    );
  } else {
    goToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"]
    );
  }
};
const closeMode = () => {
  showChooseMode.value = false;
  difficultyCoefficient.value = 30;
  checkedNoneOfAbove.value = false;
  checkedSpell.value = false;
  isInChooseMode.value = false;
};

const checkedNoneOfAbove = ref(false);
const onUpdateNoneOfAbove = (newValue) => {
  if (!originalData.value[indexAnswer.value]["none_of_above"]) {
    showFailToast("已经取消\n无需购买");
    return;
  }

  if (newValue) {
    if (userdiamonds.value < 2) {
      showFailToast("钻石💎不足");
      return;
    } else if (checkedSpell.value == true && userdiamonds.value < 1) {
      showFailToast("钻石💎不足");
      return;
    } else {
      checkedNoneOfAbove.value = true;
      checkedSpell.value = true;
    }
  } else {
    checkedNoneOfAbove.value = false;
    checkedSpell.value = false;
  }
};
const checkedSpell = ref(false);
const onUpdateCheckedSpell = async (newValue) => {
  if (!newValue) {
    checkedSpell.value = false;
    checkedNoneOfAbove.value = false;
    return;
  }
  let toast1 = showLoadingToast({
    message: "查询中...",
    forbidClick: true,
  });

  // 设置 8 秒超时
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      showFailToast("请求超时");
      resolve(null);
    }, 8000);
  });

  let res = null;

  try {
    res = await Promise.race([
      getSpellVocabulary(originalData.value[indexAnswer.value]["nid"]),
      timeoutPromise,
    ]);
    if (res === null) return;
    console.log("res:", res);
  } catch (error) {
    console.error("请求出错:", error);
  } finally {
  }

  // 确保 res 不是 null，再进行后续逻辑
  if (
    !res ||
    originalData.value[indexAnswer.value]["is_spell_number"] == 0 ||
    !originalData.value[indexAnswer.value]["none_of_above"] ||
    res.length == 0
  ) {
    showFailToast("已经取消\n无需购买");
    return;
  }

  // 处理购买逻辑
  if (newValue) {
    if (
      userdiamonds.value < 1 ||
      (checkedNoneOfAbove.value && userdiamonds.value < 2)
    ) {
      showFailToast("钻石💎不足");
      return;
    }
    checkedSpell.value = true;
  }
};

const consumeText = computed(() => {
  if (checkedNoneOfAbove.value && checkedSpell.value) {
    return "消费2";
  } else if (checkedNoneOfAbove.value || checkedSpell.value) {
    return "消费1";
  } else {
    return ""; // 如果都是 false，就不显示
  }
});
const noneOfAboveStyle = computed(() => ({
  width: "200px",
  textAlign: "left",
  whiteSpace: "nowrap",
  color: checkedNoneOfAbove.value ? "#666666" : "#999999",
  textDecoration: checkedNoneOfAbove.value ? "none" : "line-through",
}));
const spellStyle = computed(() => ({
  width: "200px",
  textAlign: "left",
  whiteSpace: "nowrap",
  color: checkedSpell.value ? "#666666" : "#999999",
  textDecoration: checkedSpell.value ? "none" : "line-through",
}));
const disabledNoneOfAbove = ref(false);
const disabledSpell = ref(false);
let isInChooseMode = ref(true);
watch(checkedNoneOfAbove, (newValue) => {
  if (isInChooseMode.value) {
    // 只有在选择模式下才触发更新
    if (newValue) {
      difficultyCoefficient.value -= 10; // checkedNoneOfAbove 变为 true 时减 10
    } else {
      difficultyCoefficient.value += 10; // checkedNoneOfAbove 变为 false 时加 10
    }
  }
});
watch(checkedSpell, (newValue) => {
  if (isInChooseMode.value) {
    // 只有在选择模式下才触发更新
    if (newValue) {
      difficultyCoefficient.value -= 15; // checkedSpell 变为 true 时减 15
    } else {
      difficultyCoefficient.value += 15; // checkedSpell 变为 false 时加 15
    }
  }
});

// 复习模式
const showReviewMode = ref(false);
const reviewShow = ref(false);
const flagReview = ref(false);
const dataReview = ref([]);
const dataReview2 = ref([]);
const srcReview = ref("");
const srcReview_first = ref("");
const srcReview_first2 = ref("");
const flagReviewList = ref(true);
const nidReview = ref("");
const reviewRequired = ref(0);
const handleReviewMode = () => {
  reviewShow.value = true;
  // console.log("flagReviewList", flagReviewList.value);
  if (flagReviewList.value) {
    // console.log("正常列表");
    dataReview.value = originalData.value[indexAnswer.value]["synonyms"];
    nidReview.value = originalData.value[indexAnswer.value]["nid"];
  } else {
    // console.log("弹出列表");
  }
  reviewRequired.value =
    reviewList.value[indexAnswer.value]["is_review_required"];
  // console.log('reviewRequired: ', reviewRequired.value);
  let resultData = [];
  // console.log("dataReview:", dataReview.value);
  for (let i = 0; i < dataReview.value.length; i++) {
    let obj = {};
    obj["is_spell"] = false;
    obj["type"] = true;
    obj["中文"] = dataReview.value[i]["中文"];
    obj["序号"] = dataReview.value[i]["序号"];
    if (flagReviewList.value) {
      obj["正确答案"] =
        originalData.value[indexAnswer.value]["answers"][i]["中文"];
    } else {
      obj["正确答案"] =
        reviewList.value[indexAnswer.value]["answers"][i]["中文"];
    }
    obj["用户选择"] = ["无"];
    obj["答案"] = obj["正确答案"];
    obj["英文"] = dataReview.value[i]["英文"];
    obj["排除"] = dataReview.value[i]["排除"];
    resultData.push(obj);
  }
  console.log("resultData", resultData);

  const countShiti = resultData.filter((item) => item.排除 != "试题").length;
  if (countShiti == 0) {
    showToast("试题组不提供预习\n请直接挑战");
  }
  dataPreExam.value = resultData;
  dataReview2.value = resultData;
};
const startReview = () => {
  // console.log("dataPreExam: ", dataPreExam.value);

  // router.push({
  //   path: "/studentAccountPreExam",
  //   state: {
  //     data: JSON.stringify(dataPreExam.value),
  //     username: username.value,
  //     account_id_list: nidReview.value,
  //     basicPreExam: basicPreExam.value,
  //   },
  // });
  console.log("reviewRequired: ", reviewRequired.value);

  router.push({
    path: "/studentAccountDaily",
    state: {
      data: JSON.stringify(dataPreExam.value),
      username: username.value,
      account_id_list: nidReview.value,
      basicPreExam: basicPreExam.value,
      reviewRequired: reviewRequired.value,
    },
  });
};
const gotoReview = (index) => {
  indexAnswer.value = index;
  dataReview.value = reviewList.value[index]["synonyms"];
  nidReview.value = reviewList.value[index]["nid"];
  // console.log(nidReview.value);
  flagReviewList.value = false;
  console.log("flagReviewList", flagReviewList.value);
  if (flagTheme.value == 1) {
    srcTheme.value = chooseModelSrcGoatAndWolfReview;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = chooseModelSrcBearsReview;
  }
  showReviewMode.value = true;
};

// 复习功能
const reviewList = ref([]);
const showReviewList = ref(false);
const loadingReviewData = ref(false);
const finishedReviewData = ref(false);
const pageIndexReviewData = ref(0);
const reviewListLength = ref(0);
const reviewList_first = ref(1);
// const onLoadReviewData = async (title = "全部") => {
//   if (loadingReviewData.value || finishedReviewData.value) {
//     return;
//   }
//   loadingReviewData.value = true;
//   isLoading.value = true;
//   try {
//     const params = new URLSearchParams();
//     params.append("method", "getUserReviewPage");
//     params.append("user", username.value);
//     params.append("page", pageIndexReviewData.value + 1);
//     params.append("page_size", 20);

//     const response = await axios.post("words/", params);
//     let moreData = response.data.data;
//     console.log("reviewListData: ", moreData);
//     moreData = moreData.map((item) => {
//       const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
//       return { ...item, progressPercentage: progress };
//     });

//     if (moreData.length) {
//       moreData.sort(
//         (a, b) => new Date(b.create_time) - new Date(a.create_time)
//       );
//       moreData.forEach((item) => {
//         const answers = JSON.parse(item.answers);
//         const synonyms = JSON.parse(item.synonyms);
//         // 解析日期并格式化
//         const date = new Date(item.create_time);
//         const viewDate = new Date(item.view_time);
//         const formatter = new Intl.DateTimeFormat("zh-CN", {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//           hour: "numeric",
//           minute: "numeric",
//           hour12: false,
//         });
//         const formattedCreateTime = formatter.format(date);
//         const formattedViewTime = formatter.format(viewDate);
//         const newItem = {
//           ...item,
//           answers: answers,
//           synonyms: synonyms,
//           create_time: formattedCreateTime,
//           view_time: formattedViewTime,
//         };
//         reviewList.value.push(newItem);
//       });
//       if (reviewList.value.length > 0) {
//         flagReview.value = true;
//         reviewListLength.value = reviewList.value.length;
//       } else {
//         reviewListLength.value = 0;
//       }

//       if (reviewList.value.length == 0) {
//         if (flagTheme.value == 1) {
//           srcReview.value = reviewCompleteSrcGoatAndWolf;
//         }
//         if (flagTheme.value == 2) {
//           srcReview.value = reviewCompleteSrcBears;
//         }
//       }
//       pageIndexReviewData.value++;
//     }
//     finishedReviewData.value = !response.data.has_more;
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   }
//   loadingReviewData.value = false;
//   isLoading.value = false;
//   console.log("reviewList", reviewList.value);
//   return reviewList.value;
// };

// 日常任务

const onLoadReviewData = async (title = "全部") => {
  if (loadingReviewData.value || finishedReviewData.value) {
    return;
  }
  loadingReviewData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserReviewPage");
    params.append("user", username.value);
    params.append("page", pageIndexReviewData.value + 1);
    params.append("page_size", 20);

    const response = await axios.post("words/", params);
    let moreData = response.data.data;
    console.log("reviewListData: ", moreData);
    moreData = moreData.map((item) => {
      const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
      return { ...item, progressPercentage: progress };
    });

    if (moreData.length) {
      // 综合排序：先按 is_review_required 从小到大，再按创建时间从新到旧
      moreData.sort((a, b) => {
        // 首先按 is_review_required 从小到大排序
        if (a.is_review_required !== b.is_review_required) {
          return a.is_review_required - b.is_review_required;
        }
        // 如果 is_review_required 相同，再按创建时间从新到旧排序
        return new Date(b.create_time) - new Date(a.create_time);
      });

      moreData.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        reviewList.value.push(newItem);
      });
      if (reviewList.value.length > 0) {
        flagReview.value = true;
        reviewList_first.value = reviewList.value.filter(
          (item) => item.is_review_required === 1
        ).length;
        reviewListLength.value = reviewList.value.length;
      } else {
        reviewListLength.value = 0;
      }

      if (reviewList.value.length == 0) {
        if (flagTheme.value == 1) {
          srcReview.value = reviewCompleteSrcGoatAndWolf;
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview.value = reviewCompleteSrcBears;
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      }
      pageIndexReviewData.value++;
    }
    finishedReviewData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingReviewData.value = false;
  isLoading.value = false;
  console.log("reviewList", reviewList.value);
  return reviewList.value;
};

const flagDaily = ref(true);
const showDailyList = ref(false);
const dailyTimes = ref(0);
const dailyList = ref([]);
const dataDaily = ref([]);
const nidDaily = ref("");
const offsetDaily = ref({
  x: window.innerWidth - 67,
  y: 70,
});
window.addEventListener("scroll", () => {
  offsetDaily.value.y = 70 + window.scrollY; // 根据滚动条动态调整 y 轴位置
});
window.addEventListener("resize", () => {
  offsetDaily.value.x = window.innerWidth - 67;
});
const badgeStyle = computed(() => {
  return {
    position: "absolute",
    left: `${offsetDaily.value.x + 40}px`,
    top: `${offsetDaily.value.y}px`,
  };
});

const popupDaily = () => {
  let toast1 = showLoadingToast({
    message: "生成中...",
    forbidClick: true,
  });
  async function getDailyTask() {
    let params = new URLSearchParams();
    params.append("method", "getDailyTask");
    params.append("user", username.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  let res = getDailyTask().then((res) => {
    dailyList.value = res.map((item, index) => {
      return {
        ...item,
        alias: `本周任务（${index + 1}）`,
      };
    });
    // console.log(dailyList.value);
  });
  res.then(() => {
    toast1.close();
    showDailyList.value = true;
  });
};
const gotoDaily = (index) => {
  let resultData = [];
  let synonyms = JSON.parse(dailyList.value[index]["synonyms"]);
  // console.log('synonyms: ', synonyms);
  let answers = JSON.parse(dailyList.value[index]["answers"]);
  // console.log('answers: ', answers);
  for (let i = 0; i < synonyms.length; i++) {
    let obj = {};
    obj["is_spell"] = false;
    obj["type"] = true;
    obj["中文"] = synonyms[i]["中文"];
    obj["序号"] = i + 1;
    obj["正确答案"] = answers[i]["中文"];

    obj["用户选择"] = ["无"];
    obj["答案"] = obj["正确答案"];
    obj["英文"] = synonyms[i]["英文"];
    obj["排除"] = synonyms[i]["排除"];
    resultData.push(obj);
  }
  // console.log("resultData:", resultData);
  router.push({
    path: "/studentAccountDaily",
    state: {
      data: JSON.stringify(resultData),
      username: username.value,
      account_id_list: dailyList.value[index]["nid"],
      basicPreExam: basicPreExam.value,
    },
  });
};

// 动画
function showAnimation() {
  preExamAnimationRef.value.show();
}

const gotoItem = (index) => {
  indexAnswer.value = index;
  flagReviewList.value = true;
  // 预热熊出没
  if (originalData.value[index]["alias"].includes("庆典")) {
    showbearWarmup();
  }
  // 复习模式
  if (originalData.value[index]["is_review_required"] == 100) {
    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolfReview;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBearsReview;
    }
    showReviewMode.value = true;
    return;
  } else {
    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolf;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBears;
    }
  }
  // 是否限制普通模式
  if (originalData.value[index]["type"] == 1) {
    isRegularModeEnabled.value = false;
    confirmButtonText.value = "无法使用";
  } else {
    isRegularModeEnabled.value = true;
    confirmButtonText.value = "普通模式";
  }

  // 计算难度系数
  const data = originalData.value[index];
  if (data.merge_option === false) {
    difficultyCoefficient.value -= 20;
  }
  // 是否锁定钻石购买
  // if (data.none_of_above== 0) {
  //   disabledNoneOfAbove.value = true;
  // } else {
  //   disabledNoneOfAbove.value = false;
  // }
  // if (!data.is_spell_number) {
  //   disabledSpell.value = true;
  // } else {
  //   disabledSpell.value = false;
  // }

  if (data.reversd_number >= 1 && data.reversd_number < 5) {
    difficultyCoefficient.value += 10;
  } else if (data.reversd_number >= 5 && data.reversd_number < 8) {
    difficultyCoefficient.value += 15;
  } else if (data.reversd_number >= 8) {
    difficultyCoefficient.value += 30;
  }

  if (data.none_of_above) {
    difficultyCoefficient.value += 10;
  }

  if (1 < data.is_spell_number < 4) {
    difficultyCoefficient.value += 15;
  }

  if (data.is_spell_number >= 4) {
    difficultyCoefficient.value += 30;
  }
  // console.log(originalData.value);
  gotoIndex.value = index;
  gotoData.value = originalData.value[index];
  // 考试模式完成，无法进入
  if (originalData.value[index]["type"] == 3) {
    const accuracy = (originalData.value[index]["rate"] * 100).toFixed(2);
    showToast(`已完成\n正确率为${accuracy}%`);
    return;
  }
  // 考试模式开始，弹出答案选择
  if (originalData.value[index]["type"] == 2) {
    showCheckAnswerSheet.value = true;
    return;
  }

  if (
    originalData.value[index]["rate"] == 0 &&
    originalData.value[index]["attempt"] == 0
    // true
  ) {
    showCheckAnswerSheet.value = true;
  } else {
    showChooseMode.value = true;
  }
};

// 是否提前查看答案
const handleCloseCheckAnswer = (action, done) => {
  if (action === "confirm" || action === "cancel") {
    done();
  }
};

const handleCloseClickCheckAnswer = () => {
  difficultyCoefficient.value = 30;
  showCheckAnswerSheet.value = false;
};
const spellWordsList = ref([]);
const handleConfirmCheckAnswer = () => {
  isLoading.value = true;
  getSpellVocabulary(originalData.value[gotoIndex.value]["nid"]).then((res) => {
    spellWordsList.value = res.flatMap((item) => {
      let dataString = item["data_words"]
        .replace(/(\W)'|'(\W)/g, '$1"$2')
        .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
      return JSON.parse(dataString);
    });

    difficultyCoefficient.value = 30;
    showAnswerSheet.value = true;
    // answerSheetList.value = originalData.value[gotoIndex.value]["answers"];
    const answers = originalData.value[gotoIndex.value]?.answers || [];
    const synonyms = originalData.value[gotoIndex.value]?.synonyms || [];

    answerSheetList.value = answers.map((item, index) => {
      return {
        ...item,
        排除: synonyms[index]?.排除 || null,
      };
    });
    console.log("answerSheetList: ", answerSheetList.value);
    const countShiti = answerSheetList.value.filter(
      (item) => item.排除 != "试题"
    ).length;
    if (countShiti == 0) {
      showAnswerSheet.value = false;
      showToast("试题组不提供预习\n请直接挑战");
    }
    showCheckAnswerSheet.value = false;
    isLoading.value = false;
  });
};

const handleCancelCheckAnswer = () => {
  // console.log(originalData.value[gotoIndex.value]);
  if (originalData.value[gotoIndex.value]["type"] == 2) {
    showCheckAnswerSheet.value = false;
    showChooseTestMode.value = true;
    return;
  }
  showChooseMode.value = true;
  showCheckAnswerSheet.value = false;
};

// 答案页步骤
const activeSteps = ref(0.2);
// 记录答案时间
const indexAnswer = ref(0);
const createTimeAnswer = ref("");
const handleAnswerSheetClose = () => {
  // 关闭答案页面执行
  const endTime = new Date();
  const timeDifference = endTime - createTimeAnswer.value;
  const minutes = Math.floor(timeDifference / 1000 / 60);
  const seconds = Math.floor((timeDifference / 1000) % 60);
  const formattedTimeDifference = `${minutes}分${seconds}秒`;
  console.log("Time Difference:", formattedTimeDifference);

  const dataAnswer = originalData.value[indexAnswer.value];
  // console.log("dataAnswer:", dataAnswer);

  const date = new Date(createTimeAnswer.value);
  const formattedDateStr = `${date.getFullYear()}年${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}月${date.getDate().toString().padStart(2, "0")}日${date
    .getHours()
    .toString()
    .padStart(2, "0")}时${date.getMinutes().toString().padStart(2, "0")}分${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}秒`;

  async function updateAnswerDuration() {
    // 上传时间
    let params = new URLSearchParams();
    params.append("method", "updateAnswerDuration");
    params.append("username", dataAnswer["username"]);
    params.append("account_data_id", dataAnswer["nid"]);
    params.append("account_log_id", -1);
    params.append("type", "预习");
    params.append("create_time", formattedDateStr);
    params.append("duration", formattedTimeDifference);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  updateAnswerDuration().then((res) => {
    console.log(res);
  });
};

watch(showAnswerSheet, (newVal) => {
  selfCheck.value = true;
  if (!newVal) {
    handleAnswerSheetClose();
  } else {
    createTimeAnswer.value = new Date();
    // console.log("createTimeAnswer:", createTimeAnswer.value);
  }
});
const handleVisibilityChange = () => {
  if (document.hidden) {
    showAnswerSheet.value = false;
    // handleAnswerSheetClose();
  }
};

const handlePageUnload = () => {
  showAnswerSheet.value = false;
  // handleAnswerSheetClose();
};

// 提前查看答案
const dialogPosition = ref({ x: 0, y: 0 });
const viewAnswer = (item, index) => {
  console.log("item: ", item);
  // console.log("item: ", item.attempt);
  // console.log("index: ", index);
  console.log("originalData: ", originalData.value[index]);
  if (item.attempt == 0) {
    gotoIndex.value = index;
    showCheckAnswerSheet.value = true;
    return;
  }
  if (item.rate >= 3) {
    getSpellVocabulary(originalData.value[index]["nid"]).then((res) => {
      console.log("res: ", res);
      spellWordsList.value = res.flatMap((item) => {
        let dataString = item["data_words"]
          .replace(/(\W)'|'(\W)/g, '$1"$2')
          .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
        return JSON.parse(dataString);
      });
      showAnswerSheet.value = true;
      // answerSheetList.value = item["answers"];
      const synonyms = item["synonyms"];
      const answers = item["answers"];

      answerSheetList.value = answers.map((ans, idx) => {
        const exclude = synonyms?.[idx]?.排除 || "";
        return {
          ...ans,
          排除: exclude,
        };
      });

      console.log("answerSheetList: ", answerSheetList.value);
    });
    return;
  }
  showAnimationShine();
  showConfirmDialog({
    title: "😈 恶魔之眼 😈",
    message: "要查看答案吗？\n您的行为会被记录（首次不记录）",
    confirmButtonText: "查看答案",
    cancelButtonText: "取消，不看了",
    cancelButtonColor: "red",
    confirmButtonColor: "gray",
    className: "custom-dark-dialog", // 添加自定义类名
  })
    .then(() => {
      showAnimationShine();
      isLoading.value = true;
      getSpellVocabulary(originalData.value[index]["nid"]).then((res) => {
        console.log("res: ", res);
        spellWordsList.value = res.flatMap((item) => {
          let dataString = item["data_words"]
            .replace(/(\W)'|'(\W)/g, '$1"$2')
            .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
          return JSON.parse(dataString);
        });
        showAnswerSheet.value = true;
        isLoading.value = false;
        // answerSheetList.value = item["answers"];
        const answers = originalData.value[index]?.answers || [];
        const synonyms = originalData.value[index]?.synonyms || [];

        answerSheetList.value = answers.map((item, index) => {
          return {
            ...item,
            排除: synonyms[index]?.排除 || null,
          };
        });
        console.log("answerSheetList: ", answerSheetList.value);
        const countShiti = answerSheetList.value.filter(
          (item) => item.排除 != "试题"
        ).length;
        if (countShiti == 0) {
          showAnswerSheet.value = false;
          showToast("试题组不提供预习\n请直接挑战");
          return;
        }

        // 定义异步函数updateView
        async function updateView() {
          // 更新 view + 1
          let params = new URLSearchParams();
          params.append("method", "updateView");
          params.append("nid", item["nid"]);
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }
        // 调用updateView并处理其promise
        if (item.attempt > 0) {
          updateView().then((res) => {
            originalData.value = [];
            pageIndexOriginalData.value = 0;
            finishedOriginalData.value = false;
            loadingOriginalData.value = false; // 重新触发加载
            onLoadOriginalData(); // 手动调用onLoad以重新开始加载过程
            activeTabs.value = 0;
          });
        }
        // else {
        //   originalData.value = [];
        //   pageIndexOriginalData.value = 0;
        //   finishedOriginalData.value = false;
        //   loadingOriginalData.value = false; // 重新触发加载
        //   onLoadOriginalData(); // 手动调用onLoad以重新开始加载过程
        //   activeTabs.value = 0;
        // }
      });
    })
    .catch(() => {
      showAnimationShine();
    });
  nextTick(() => {
    const dialogElement = document.querySelector(".custom-dark-dialog");

    if (dialogElement) {
      const rect = dialogElement.getBoundingClientRect();
      // console.log('rect: ', rect)

      // 将对话框的坐标存储在 ref 中
      dialogPosition.value = {
        x: rect.right - rect.width * 1.4,
        y: rect.top - rect.height * 2,
      };
      // console.log("dialogPosition:", dialogPosition.value);
    }
  });
};

// 星星plus显示
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});

// 总进度环形circle
const currentRate = ref(0);
const nameCircle = ref("全部");
const textCircle = computed(() => currentRate.value.toFixed(0) + "%");
const gradientColor = ref({
  "0%": "#ff0000",
  "100%": "#ffff00",
});

const getGradientColor = (index) => {
  const colors = [
    { "0%": "#ff0000", "100%": "#ffff00" }, // 红到黄
    { "0%": "#ffff00", "100%": "#00ff00" }, // 黄到绿
    { "0%": "#00ff00", "100%": "#ff00ff" }, // 绿到粉
    { "0%": "#3fecff", "100%": "#6149f6" },
  ];
  // 循环使用颜色
  gradientColor.value = colors[index % colors.length];
  // return colors[index % colors.length];
};

const rateCircle = ref(0);
const rateCircleList = ref([]);

const starRate = ref(1); // 总星星数

const starRateNumber = ref(0);
const starRateNumberList = ref([]);
const completeNumber = ref(0);
const completeNumberList = ref([]);

// textbook单词表
const textbookData = ref([]);
const showTextbookPop = ref(false);
const meaningShow = ref(false);
const meaningTitle = ref("");
const meaningData = ref({
  高考: { 英文: "", 中文: "" },
  教材: [{ 中文: "", 模块: "", 教材: "" }],
});

const showTextbook = () => {
  showTextbookPop.value = true;
  async function queryTextbook() {
    // 查询textbook
    let params = new URLSearchParams();
    params.append("method", "queryTextbook");
    params.append("username", username.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  queryTextbook().then((res) => {
    if (res.length != 0) {
      textbookData.value = JSON.parse(res[0]["textbook"]);
      textbookData.value.sort((a, b) => b.times - a.times);
      console.log("textbookData: ", textbookData.value);
    } else {
      showConfirmDialog({
        title: "你还没有尝试单词挑战",
        theme: "round-button",
        showCancelButton: false,
        message: "单词表会随着挑战自动定制专属词汇\n开始挑战吧！",
      }).then(() => {
        showTextbookPop.value = false;
      });
    }
  });
};
const getVocabularyMeaning = (index) => {
  const word = textbookData.value[index].英文;
  async function getWordMeaning() {
    // 查询单词含义
    let params = new URLSearchParams();
    params.append("method", "getTextbookMeaning");
    params.append("word", word);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showLoadingToast({
    message: "加载中...",
    duration: 0,
  });
  getWordMeaning()
    .then((res) => {
      // console.log("res", res);
      const sortOrder = [
        "七上",
        "七下",
        "八上",
        "八下",
        "九上",
        "九下",
        "必修一",
        "必修二",
        "必修三",
        "选修一",
        "选修二",
        "选修三",
        "选修四",
      ];
      res["教材"].sort((a, b) => {
        return sortOrder.indexOf(a.教材) - sortOrder.indexOf(b.教材);
      });
      meaningTitle.value = word;
      if (res["教材"] == []) {
        meaningData.value["教材"] = ["无"];
      } else {
        meaningData.value["教材"] = res["教材"];
      }

      if (Object.keys(res["高考"]).length === 0) {
        meaningData.value["高考"]["中文"] = "无";
      } else {
        meaningData.value["高考"]["中文"] = res["高考"]["中文"];
        meaningData.value["高考"]["英文"] = res["高考"]["英文"];
      }
      // console.log("meaningData", meaningData.value);
    })
    .then((res) => {
      closeToast();
      meaningShow.value = true;
    })
    .catch((err) => {
      closeToast();
      showFailToast("查询失败");
    });
};

// 导航分类
const activeTabs = ref("0");
const tabsName = ref([]);

// 加载数据
const originalData = ref([]);
const showStars = ref(false);
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const username = ref("");
const progressPercentage = ref("0");

const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};

// 分页加载
const onLoadOriginalData = async (title = "全部") => {
  // console.log("title: ", title);
  // console.log('finishedOriginalData.value: ', finishedOriginalData.value);
  // console.log('loadingOriginalData.value: ', loadingOriginalData.value);
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserDataPage");
    params.append("alias", title);
    params.append("user", username.value);
    params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
    params.append("page_size", 20); // 每页数据大小

    const response = await axios.post("words/", params);
    let moreData = response.data.data;
    // moreData.forEach((item) => {
    //   console.log(item.apply_challenge);
    // });

    moreData = moreData.map((item) => {
      const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
      return { ...item, progressPercentage: progress };
    });

    if (moreData.length) {
      function sortDataByfigures(moreData) {
        // 汉字数字映射
        const chineseNumMap = {
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          十一: 11,
          十二: 12,
          十三: 13,
          十四: 14,
          十五: 15,
          十六: 16,
          十七: 17,
          十八: 18,
          十九: 19,
          二十: 20,
          二十一: 21,
          二十二: 22,
          二十三: 23,
          二十四: 24,
          二十五: 25,
          二十六: 26,
          二十七: 27,
          二十八: 28,
          二十九: 29,
          三十: 30,
          三十一: 31,
          三十二: 32,
          三十三: 33,
          三十四: 34,
          三十五: 35,
          三十六: 36,
          三十七: 37,
          三十八: 38,
          三十九: 39,
          四十: 40,
          四十一: 41,
          四十二: 42,
          四十三: 43,
          四十四: 44,
          四十五: 45,
          四十六: 46,
          四十七: 47,
          四十八: 48,
          四十九: 49,
          五十: 50,
        };
        // 提取标题中的固定部分和数字部分
        moreData = moreData.map((item) => {
          const match = item.title.match(
            /(.+?)(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十|三十一|三十二|三十三|三十四|三十五|三十六|三十七|三十八|三十九|四十|四十一|四十二|四十三|四十四|四十五|四十六|四十七|四十八|四十九|五十)(\.\w+)$/
          );
          if (match) {
            return {
              ...item,
              title_base: match[1], // 提取标题中的固定部分
              title_num: chineseNumMap[match[2]], // 提取汉字数字部分并转换为阿拉伯数字
              title_ext: match[3], // 提取扩展名部分
            };
          } else {
            return {
              ...item,
              title_base: item.title,
              title_num: 0,
              title_ext: "",
            };
          }
        });
        // 将 is_pinned 为 true 且 rate < 3 的项放到最前面
        const pinnedItems = moreData.filter(
          (item) => item.is_pinned && item.rate < 3
        );
        const otherItems = moreData.filter(
          (item) => !(item.is_pinned && item.rate < 3)
        );

        // 根据标题的固定部分分组
        const groups = otherItems.reduce((acc, item) => {
          const base = item.title_base;
          if (!acc[base]) {
            acc[base] = [];
          }
          acc[base].push(item);
          return acc;
        }, {});

        // 对每个分组进行排序，并且对整个分组也按照 create_time 进行排序
        const sortedGroups = Object.values(groups)
          .map((group) => {
            group.sort((a, b) => a.title_num - b.title_num); // 组内按 title_num 升序
            return group;
          })
          .sort(
            (a, b) => new Date(b[0].create_time) - new Date(a[0].create_time)
          ); // 组间按 create_time 降序

        // 将分组后的数据合并回数组
        const result = [...pinnedItems, ...sortedGroups.flat()];

        return result;
      }

      moreData.sort(
        (a, b) => new Date(b.create_time) - new Date(a.create_time)
      );
      // console.log("moreData1: ", moreData);

      const result = sortDataByfigures(moreData);
      console.log("moreDat2: ", result);

      result.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        originalData.value.push(newItem);
      });
      pageIndexOriginalData.value++;
    }
    finishedOriginalData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingOriginalData.value = false;
  isLoading.value = false;

  // if (missyouFlag.value) {
  //   showAnimationShineMissYou();
  //   missyouFlag.value = false;
  // }

  if (
    !sessionStorage.getItem("missyouAnimationShown") &&
    missyouFlag.value == true
  ) {
    showAnimationShineMissYou();
    sessionStorage.setItem("missyouAnimationShown", "true");
  }
  return originalData.value;
};

// 点击tab
const onClickTab = ({ title }) => {
  // console.log('title: ', title);
  originalData.value = [];
  loadingOriginalData.value = false;
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;
  nameCircle.value = title;
  const listTabs = ["全部", ...tabsName.value];
  const indexClickTab = listTabs.lastIndexOf(nameCircle.value);

  rateCircle.value = 0;
  setTimeout(() => {
    rateCircle.value = rateCircleList.value[indexClickTab];
  }, 0);
  currentRate.value = rateCircle.value;

  // console.log("rateCircle: ", rateCircle.value);
  starRateNumber.value = starRateNumberList.value[indexClickTab];
  completeNumber.value = completeNumberList.value[indexClickTab];
  getGradientColor(indexClickTab);
  onLoadOriginalData(title);
};

// 获取rateCircle
async function getRateCircle() {
  let params = new URLSearchParams();
  params.append("method", "getRateCircle");
  params.append("username", username.value);
  params.append("listlAias", JSON.stringify(tabsName.value));
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
// 生气动画
const wolfBackRef = ref(null);

const startOutRef = ref(null);
const threeStarRef = ref(null);
const animationVisible = ref(false);

function showAnimationShine() {
  if (wolfBackRef.value.visible) {
    wolfBackRef.value.hide();
  } else {
    wolfBackRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

function showAnimationShineThreeStar() {
  if (threeStarRef.value.visible) {
    threeStarRef.value.hide();
  } else {
    threeStarRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// miss动画
const missyouRef = ref(null);
const missyouFlag = ref(false);
const missDays = ref(2);
function showAnimationShineMissYou() {
  missyouRef.value.show();

  setTimeout(() => {
    missyouRef.value.hide();
  }, 8000);
}

const processedTitle = (title) => {
  return title.split(".")[0]; // 获取第一个句点（.）之前的部分
};

// swipe徽章
const flagSwipe = ref(1);
const usercoins = ref(0);
const userdiamonds = ref(0);
const getPassiveRef = ref(null);
function showPassiveMagic() {
  if (getPassiveRef.value.visible) {
    getPassiveRef.value.hide();
  } else {
    getPassiveRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// 临考模式
const selectedItems = ref([]);
const dataPreExam = ref([]);
const basicPreExam = ref([]);
const account_id_list = ref([]);
const valueDropdown = ref(0);
const preExamShow = ref(false);
const optionDropdown = ref([
  { text: "普通模式", value: 0 },
  { text: "临考模式", value: 1 },
]);
const switchText = ref("普通模式");
const checkedSwitch = ref(true);
const showSwitchToast = ref(false);

const cellValue = ref(true);
const isMultiSelectMode = ref(false);
const toggleMultiSelectMode = () => {
  // cellValue.value = !cellValue.value;
  if (!checkedSwitch.value) {
    showSwitchToast.value = true;
    switchText.value = "多组复习";
  } else {
    switchText.value = "普通模式";
  }
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const gotoPreExam = () => {
  // console.log(originalData.value);
  if (selectedItems.value.length < 2) {
    showFailToast("至少选择俩项");
    return;
  }
  if (selectedItems.value.length > 5) {
    showFailToast("至多选择5项");
    return;
  }
  const titles = selectedItems.value.map((id) => {
    return originalData.value[id].title;
  });
  const titlesHtml = titles
    .map((item) => `<div style="text-align: left;">${item}</div>`)
    .join("");
  showConfirmDialog({
    title: "确定将以下生成考前复习",
    message: titlesHtml,
    theme: "round-button",
    allowHtml: true,
  }).then(async () => {
    account_id_list.value = selectedItems.value.map(
      (id) => originalData.value[id].nid
    );
    const params = new URLSearchParams();
    params.append("method", "getPreExam");
    params.append("account_id_list", JSON.stringify(account_id_list.value));
    isLoading.value = true;
    try {
      const res = await axios.post("words/", params);
      console.log("res: ", res);
      dataPreExam.value = res.data.dataPreExam;

      // dataPreExam.value = dataPreExam.value
      //   .filter((item) => !/__{3,}/.test(item["英文"])) // 删除含有 3 个或以上下划线的项
      //   .map((item) => {
      //     if (item["正确答案"] === "无") {
      //       return {
      //         ...item,
      //         正确答案: item["答案"],
      //       };
      //     }
      //     return item;
      //   });
      dataPreExam.value = dataPreExam.value
        .filter((item) => {
          return !/__{3,}/.test(item["英文"]) && item["排除"] !== "手写";
        })
        .map((item) => {
          if (item["正确答案"] === "无") {
            return {
              ...item,
              正确答案: item["答案"],
            };
          }
          return item;
        });
      console.log("dataPreExam: ", dataPreExam.value);
      isLoading.value = false;
      preExamShow.value = true;
    } catch (error) {
      console.error("请求错误:", error);
      // 如果捕捉到错误，执行相应的函数
      showToast({
        message: "生成错误，请尝试更改选择顺序",
        duration: 10000,
        closeOnClick: true,
        closeOnClickOverlay: true,
      });
      isLoading.value = false;
      return;
    }
  });
};
const startPreExam = () => {
  // console.log("dataPreExam: ", dataPreExam.value);
  router.push({
    path: "/studentAccountPreExam",
    state: {
      data: JSON.stringify(dataPreExam.value),
      username: username.value,
      account_id_list: JSON.stringify(account_id_list.value),
      basicPreExam: basicPreExam.value,
    },
  });
};

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handlePageUnload);
  window.removeEventListener("pagehide", handlePageUnload);
});
const flagRate = ref(null);

const bearWarmupRef = ref(null);
function showbearWarmup() {
  if (bearWarmupRef.value.visible) {
    bearWarmupRef.value.hide();
  } else {
    bearWarmupRef.value.show();
  }
}
// 弹幕
const listBarrage = ref([]);
const listVideo = ref([]);
let wordIndex = 0; // 记录当前弹幕单词索引
let intervalId = null; // 保存 setInterval 的 ID，用于停止定时器

// 开始定时器，显示弹幕
intervalId = setInterval(() => {
  if (wordIndex < listVideo.value.length) {
    listBarrage.value.push({
      id: Math.random(),
      text: listVideo.value[wordIndex],
    });

    // 触发 Vue 重新渲染
    listBarrage.value = [...listBarrage.value];

    // 循环弹幕索引
    wordIndex = (wordIndex + 1) % listVideo.value.length;
  } else {
    wordIndex = 0;
  }
}, 1000);
// 使用 setTimeout 来在15秒后停止弹幕更新
setTimeout(() => {
  clearInterval(intervalId); // 停止 setInterval
  console.log("弹幕停止，已持续15秒");
}, 15000); // 10秒后停止

// 挑战赛
const result = ref("");
const challengeConfirmRef = ref(null);
function showChallenge() {
  challengeConfirmRef.value.show();
}
async function handleConfirmChallenge() {
  const applyitem = originalData.value[indexAnswer.value];
  console.log("applyitem: ", applyitem);
  let params = new URLSearchParams();
  params.append("method", "applyforChallenge");
  params.append("nid", applyitem["nid"]);
  const res = await axios.post("words/", params);
  console.log("res: ", res.data);
  if (res.data == "申请失败") {
    showFailToast("申请失败，联系老师");
  } else {
    goToNextPage(
      indexAnswer.value,
      originalData.value[indexAnswer.value],
      4,
      0,
      1,
      0,
      0
    );
  }
}

function handleCancelChallenge() {
  challengeConfirmRef.value.hide();
}

const applyforChallenge = () => {
  showChallenge();
  // showConfirmDialog({
  //   title: "确定向老师申请挑战赛吗",
  //   message: "获胜可赢得金色标志",
  //   theme: "round-button",
  //   allowHtml: true,
  // }).then(async () => {

  //   let params = new URLSearchParams();
  //   params.append("method", "applyforChallenge");
  //   params.append("nid", applyitem["nid"]);
  //   const res = await axios.post("words/", params);
  //   console.log("res: ", res.data);
  //   if (res.data == "申请失败") {
  //     showFailToast("申请失败，联系老师");
  //   } else {
  //     goToNextPage(
  //       indexAnswer.value,
  //       originalData.value[indexAnswer.value],
  //       4,
  //       0,
  //       1,
  //       0,
  //       0
  //     );
  //   }
  // });
};

// 主题
onMounted(async () => {
  // 弹幕单词
  // 检查并清理旧格式的数据
  const storedList = localStorage.getItem("listBarrage");
  if (storedList && storedList !== "null" && storedList !== "undefined") {
    try {
      const parsedData = JSON.parse(storedList);
      // 如果解析的数据没有timestamp属性，说明是旧格式，删除它
      if (!parsedData.timestamp) {
        localStorage.removeItem("listBarrage");
        console.log("删除了旧格式的listBarrage数据");
      }
    } catch (error) {
      // 如果JSON解析失败，也删除这个数据
      localStorage.removeItem("listBarrage");
      console.log("删除了无效的listBarrage数据");
    }
  }

  // 弹幕单词
  const storedListAfterCheck = localStorage.getItem("listBarrage");
  if (
    storedListAfterCheck &&
    storedListAfterCheck !== "null" &&
    storedListAfterCheck !== "undefined"
  ) {
    const parsedData = JSON.parse(storedListAfterCheck);
    listVideo.value = parsedData.words; // 取出words部分
    // console.log("listVideo: ", listVideo.value);
  } else {
    console.log("listBarrage 不存在或为空");
  }

  // 获得user
  let user =
    (history.state.data && JSON.parse(history.state.data).username) ||
    history.state.username;
  const userData = JSON.parse(localStorage.getItem("userData"));
  // console.log("localuserData", userData);
  if (!user) {
    // 关闭页面
    router.push({
      path: "/homepage",
    });
  }

  async function getUserThemeAndPassiveMagic() {
    let params = new URLSearchParams();
    params.append("method", "getUserThemeAndPassiveMagic");
    params.append("user", user);

    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  getUserThemeAndPassiveMagic().then((res) => {
    // console.log("res", res);
    if (res.theme == 1) {
      localStorage.setItem("theme_name", "喜羊羊与灰太狼");
    }
    if (res.theme == 2) {
      localStorage.setItem("theme_name", "熊出没");
    }

    passive_magic.value = res.passive_magic;
    // console.log("passive_magic", passive_magic.value);

    flagTheme.value = res.theme;
    // console.log("flagTheme.value", flagTheme.value);

    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolf;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBears;
    }
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handlePageUnload);
  window.addEventListener("pagehide", handlePageUnload);

  sessionStorage.removeItem("showAnswerMagic");
  sessionStorage.removeItem("showMagic");
  sessionStorage.removeItem("flagHelp");
  sessionStorage.removeItem("numberShowAnswer");
  sessionStorage.removeItem("numberTransparent");
  sessionStorage.removeItem("numberPrev");
  // 弹出庆祝
  // flagRate.value = history.state?.flagRate;
  missyouFlag.value = history.state?.missyouflag;
  // missDays.value = history.state?.missDays;
  missDays.value = history.state?.missDays ?? NaN;
  await nextTick(); // 等待页面完全渲染

  // flagRate.value = 3;
  // if (flagRate.value !== undefined) {
  //   if (flagRate.value > 2.8) {
  //     flagRate.value = 3;
  //   }
  //   if (
  //     flagRate.value === 3 &&
  //     !sessionStorage.getItem("shineThreeStarShown")
  //   ) {
  //     showAnimationShineThreeStar();
  //     sessionStorage.setItem("shineThreeStarShown", "true");
  //   }
  // }
  // console.log("flagRate: ", flagRate.value);
  // 加载数据
  originalData.value = [];
  let res = new Promise(async (resolve, reject) => {
    // console.log(history.state)
    // console.log("history.state.data", history.state.data);
    if (!history.state.data) {
      // 关闭页面，这个是undefined
      router.push({
        path: "/homepage",
      });
    } else {
      let res = JSON.parse(history.state.data);
      basicPreExam.value = history.state.data;
      // console.log('history.state: ', history.state);
      if (res.hasOwnProperty("username")) {
        tabsName.value = res.unique_aliases;
        username.value = res.username;
        resolve("ok");
      } else {
        // tabsName.value = JSON.parse(history.state.unique_aliases);
        try {
          // 尝试解析 JSON 数据
          // console.log("tabsName", tabsName);
          tabsName.value = JSON.parse(history.state.unique_aliases);
        } catch (error) {
          // 如果解析失败，捕获错误并处理
          console.error("Error parsing JSON:", error);
          router.push({
            path: "/homepage",
          });
        }
        username.value = history.state.username;
        resolve("ok");
      }
    }
  });
  res = res.then(() => {
    getRateCircle().then((res) => {
      rateCircleList.value = res.map((item) => item.rate * 100);
      // starRateNumberList.value = res.map((item) => item.starRateNumber);
      starRateNumberList.value = res.map((item) => {
        if (Number.isInteger(item.starRateNumber)) {
          return item.starRateNumber;
        } else {
          return parseFloat(item.starRateNumber.toFixed(1));
        }
      });
      completeNumberList.value = res.map((item) => item.completeNumber);

      rateCircle.value = rateCircleList.value[0];
      starRateNumber.value = starRateNumberList.value[0];
      completeNumber.value = completeNumberList.value[0];
    });

    return "ok";
  });
  res = res.then(() => {
    async function getUserCoins() {
      let params = new URLSearchParams();
      params.append("method", "getUserCoins");
      params.append("username", username.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    // console.log('username', username.value);
    // 期末庆典
    getUserCoins().then((res) => {
      // console.log('res: ', res);
      usercoins.value = res["data_coins"][0]["coins"];
      userdiamonds.value = res["data_coins"][0]["diamonds"];
      // userdiamonds.value = 1;
      // console.log("usercoins: ", usercoins.value);
    });
    return "ok";
  });
  // flagRate.value = 3;
  // showPassiveMagic();
  res = res.then(() => {
    localStorage.removeItem("giveBears");
    if (flagRate.value >= 3 && !localStorage.getItem("givePassiveMagic")) {
      // 判断赠送 Bears
      async function checkExecutionBears() {
        let params = new URLSearchParams();
        params.append("method", "checkExecutionBears");
        params.append("username", username.value);
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      checkExecutionBears().then((res) => {
        console.log("是否需要赠送", res);
        // res.all_above_3 = true;
        if (res.all_above_3) {
          async function addThemeBears() {
            let params = new URLSearchParams();
            params.append("method", "addThemeBears");
            params.append("username", username.value);
            return await axios.post("words/", params).then((ret) => {
              return ret.data;
            });
          }
          addThemeBears().then((res) => {
            // console.log("res", res);
            // localStorage.setItem("theme_name", "熊出没");
            localStorage.setItem("givePassiveMagic", true);
            showPassiveMagic();
          });
          // console.log("bears available")
        } else {
          // console.log("not available")
        }
      });
    }
    return "ok";
  });
  res = res.then(() => {
    // 判断是否需要复习
    async function getFlagReview() {
      const params = new URLSearchParams();
      params.append("method", "getUserReviewPage");
      params.append("user", username.value);
      params.append("page", pageIndexReviewData.value + 1);
      params.append("page_size", 20);

      return await axios.post("words/", params).then((ret) => {
        return ret.data.data;
      });
    }

    getFlagReview().then((response) => {
      console.log("response: ", response);
      reviewList_first.value = response.filter(
        (item) => item.is_review_required === 1
      ).length;
      if (response.length > 0) {
        flagReview.value = true;
        reviewListLength.value = response.length;
        if (flagTheme.value == 1) {
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      } else {
        flagReview.value = false;
        if (flagTheme.value == 1) {
          srcReview.value = reviewCompleteSrcGoatAndWolf;
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview.value = reviewCompleteSrcBears;
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      }
    });
    return "ok";
  });
  // res = res.then(() => {
  //   // 得到每日任务信息
  //   async function getFlagReview() {
  //     const params = new URLSearchParams();
  //     params.append("method", "getUserDaily");
  //     params.append("user", username.value);

  //     return await axios.post("words/", params).then((ret) => {
  //       return ret.data;
  //     });
  //   }
  //   getFlagReview().then((res) => {
  //     if (res == 0) {
  //       flagDaily.value = false;
  //     }
  //     dailyTimes.value = res;
  //   });
  // });
});
</script>

<template>
  <div class="container">
    <div class="nav-bar-container">
      <van-nav-bar
        :right-text="username"
        :left-text="isMultiSelectMode ? '确定选择' : '登出'"
        @click-left="isMultiSelectMode ? gotoPreExam() : gobackHomepage()"
      >
        <template #title>
          <div>任务</div>
        </template>
        <template #right>
          <div style="color: #1a89fa; font-size: 15px">
            {{ username }}
          </div>
        </template>
        <template #left>
          <div style="color: #1a89fa; font-size: 15px">
            {{ isMultiSelectMode ? "确定" : "登出" }}&nbsp;
            <span @click.stop="handleCoinClick"> 💰 {{ usercoins }}</span>
            <span @click.stop="handleDiamondClick">
              💎 {{ userdiamonds }}
            </span>
          </div>
        </template>
      </van-nav-bar>
    </div>

    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/studentAccountList"
        >主页</van-tabbar-item
      >
      <van-tabbar-item
        icon="shopping-cart-o"
        replace
        :to="{ path: '/userinformation', query: { param: username } }"
        >商城</van-tabbar-item
      >
    </van-tabbar>

    <div class="custom-container">
      <div style="margin-left: 1rem; margin-top: 0.2rem">
        <!-- 共获得星星 -->
        <div style="display: flex">
          <div style="margin-top: 0.3rem">共获得</div>
          <van-rate
            v-model="starRate"
            color="#ffd21e"
            icon="like"
            :count="1"
            readonly
            allow-half
            size="28"
            style=""
          >
          </van-rate>
          <div style="margin-top: 0.3rem">
            &nbsp;&nbsp;✖️ {{ starRateNumber }}
          </div>
        </div>

        <!-- 共完成任务 -->
        <div style="display: flex; margin-top: 0.9rem">
          <div style="margin-top: 0.2rem">共完成</div>
          <img
            src="../assets/item_list_complete.png"
            style="
              width: 28px;
              height: auto;
              margin-right: rem;
              margin-left: 0.5rem;
              margin-top: -0.1rem;
            "
          />
          <div style="margin-top: 0.2rem">
            &nbsp;&nbsp;✖️ {{ completeNumber }}
          </div>
        </div>

        <!-- 待复习 -->
        <div style="display: flex">
          <div
            v-if="flagReview"
            style="display: flex; margin-top: 0.9rem"
            class="flashing-icon"
          >
            <div style="display: flex; align-items: center; position: relative">
              <van-badge
                :content="reviewList_first || ''"
                style="margin-left: -0.7rem"
              >
                <van-button
                  block
                  plain
                  round
                  size="small"
                  color="gray"
                  @click="showReviewList = true"
                >
                  ⚡️ 待复习
                </van-button>
              </van-badge>
              <img
                :src="
                  reviewList_first === 0 ? srcReview_first2 : srcReview_first
                "
                style="
                  width: auto;
                  height: 40px;
                  position: absolute;
                  left: calc(100% + 15px);
                  top: 38%;
                  transform: translateY(-50%);
                  z-index: 10;
                "
              />
            </div>
          </div>
          <div v-else>
            <img
              :src="srcReview"
              style="
                width: auto;
                height: 50px;
                margin-right: rem;
                margin-left: -0.5rem;
                margin-top: 0.1rem;
                margin-bottom: -0.6rem;
              "
            />
          </div>
        </div>
      </div>

      <div style="margin-right: 2rem">
        <div style="margin-bottom: 0.5rem; text-align: center">
          {{ nameCircle }}：
        </div>
        <van-circle
          class="name-circle"
          v-model:current-rate="currentRate"
          :rate="rateCircle"
          :speed="80"
          :text="textCircle"
          :color="gradientColor"
          size="90px"
          :stroke-width="60"
        />
      </div>
    </div>

    <!-- <van-dropdown-menu>
      <van-dropdown-item
        v-model="valueDropdown"
        :options="optionDropdown"
        @change="toggleMultiSelectMode(valueSort)"
      />
    </van-dropdown-menu> -->
    <div style="display: flex; width: 100%">
      <div style="font-size: 12px; margin: 0.2rem 0 0 0.8rem">
        {{ switchText }}
      </div>
      <van-switch
        style="margin-left: 0.5rem"
        size="18px"
        v-model="checkedSwitch"
        inactive-color="red"
        @change="toggleMultiSelectMode"
      />
      <van-notice-bar
        style="
          --van-notice-bar-icon-min-width: 16px;
          --van-notice-bar-padding: 0 0; /* 调整内边距，减少图标与文本的间距 */
          flex: 1;
          height: 20px;
          margin-left: 0.5rem;
          margin-right: 0.5rem;
          margin-top: 0.2rem;
        "
        left-icon="volume-o"
        scrollable
        :delay="1"
        :speed="80"
        text="挑战模式更新，新动画 新音效 新创意。发音功能持续优化中..."
      />
    </div>
    <van-toast
      v-model:show="showSwitchToast"
      style="padding: 1rem"
      :closeOnClick="true"
      :duration="3000"
      :closeOnClickOverlay="true"
    >
      <template #message>
        <div>
          <p>1. 先选中单词组</p>
          <p>2. 点击左上角 确定选择</p>
        </div>
      </template>
    </van-toast>

    <!-- 任务列表 -->
    <van-tabs
      v-model:active="activeTabs"
      @click-tab="onClickTab"
      shrink
      swipeable
      sticky
    >
      <van-tab title="全部">
        <van-list
          v-model="loadingOriginalData"
          :finished="finishedOriginalData"
          finished-text="没有更多了"
          @load="onLoadOriginalData"
        >
          <div v-for="(item, index) in originalData" :key="index">
            <div v-if="item.type !== 2 && item.type != 3">
              <van-cell
                is-link
                center
                clickable
                @click="isMultiSelectMode ? selectItem(index) : gotoItem(index)"
                :class="{ 'pin-background': item.is_pinned && item.rate < 3 }"
                class="custom-cell"
              >
                <template #icon>
                  <div v-if="item.alias.includes('庆典')">
                    <img
                      v-if="item.rate < 3"
                      src="../assets/Boonie Bears/item_list.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      alt="Item List Complete"
                    />
                    <img
                      v-else
                      src="../assets/item_list_complete.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      class="image-middle"
                      alt="Item List Complete"
                    />
                  </div>
                  <div v-else>
                    <div v-if="item.is_review_required == 1">
                      <img
                        src="../assets/item_list_complete_reviewed.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        class="image-middle"
                        alt="Item List"
                      />
                    </div>
                    <div v-else>
                      <img
                        v-if="item.rate < 3"
                        src="../assets/item_list.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        class="image-middle"
                        alt="Item List"
                      />
                      <img
                        v-else
                        src="../assets/item_list_complete.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        class="image-middle"
                        alt="Item List Complete"
                      />
                    </div>
                  </div>
                </template>

                <template #title>
                  <div
                    v-if="item.swipe == 0"
                    style="display: flex; align-items: flex-start; width: 160%"
                  >
                    <img
                      v-show="item.alias.includes('庆典')"
                      src="../assets/Boonie Bears/edge.png"
                      style="
                        width: 25px;
                        height: auto;
                        margin-top: -0.2rem;
                        margin-left: -2.2rem;
                        margin-right: 0.7rem;
                      "
                    />

                    <div style="margin-bottom: 7px; font-weight: 700">
                      <div>{{ processedTitle(item.title) }}</div>
                    </div>
                    <van-badge
                      content="Game"
                      color="lightgray"
                      style="margin-left: -20px"
                    />
                  </div>

                  <div
                    v-else
                    style="display: flex; align-items: flex-start; width: 160%"
                  >
                    <img
                      v-show="item.alias.includes('庆典')"
                      src="../assets/Boonie Bears/edge.png"
                      style="
                        width: 25px;
                        height: auto;
                        margin-top: -0.2rem;
                        margin-left: -2.2rem;
                        margin-right: 0.7rem;
                      "
                    />
                    <div
                      v-if="item.is_review_required == 1"
                      style="
                        margin-bottom: 7px;
                        font-weight: 700;
                        color: lightgray;
                      "
                    >
                      {{ processedTitle(item.title) }}
                    </div>
                    <div v-else style="margin-bottom: 7px; font-weight: 700">
                      {{ processedTitle(item.title) }}
                    </div>
                    <van-badge
                      v-if="item.is_review_required == 1"
                      color="#D8A7B1"
                      content="Game"
                      style="margin-left: -20px"
                    />
                    <van-badge
                      v-else
                      content="Game"
                      style="margin-left: -20px"
                    />
                  </div>
                </template>

                <template #value>
                  <div
                    v-if="item.is_review_required == 1"
                    style="font-size: 12px; color: lightgray"
                  >
                    <div style="display: flex; justify-content: flex-end">
                      尝试了
                      <div style="font-weight: 700; color: bisque">
                        {{ item.attempt }}
                      </div>
                      次
                    </div>

                    <div style="margin-top: 0.5rem">
                      {{ item.answers.length }}词
                    </div>
                  </div>

                  <div v-else style="font-size: 12px">
                    <div style="display: flex; justify-content: flex-end">
                      尝试了
                      <div style="font-weight: 700; color: red">
                        {{ item.attempt }}
                      </div>
                      次
                    </div>

                    <div style="margin-top: 0.5rem">
                      {{ item.answers.length }}词
                    </div>
                  </div>

                  <div v-if="item.view == 0">
                    <van-button
                      style="color: gray; border: none"
                      size="mini"
                      @click.stop="viewAnswer(item, index)"
                      class="button-container2"
                    >
                      <span class="button-content">
                        <img
                          src="../assets/close_eye.png"
                          alt="Icon"
                          class="button-icon"
                        />
                      </span>
                    </van-button>
                  </div>

                  <div v-else>
                    <van-button
                      style="color: red; font-weight: 700; border: none"
                      size="small"
                      @click.stop="viewAnswer(item, index)"
                      class="button-container2"
                    >
                      <span class="button-content">
                        <img
                          src="../assets/eye.png"
                          alt="Icon"
                          class="button-icon"
                          style="margin-right: 0.1rem"
                        />
                        * {{ item.view }}
                      </span>
                    </van-button>
                  </div>
                </template>

                <template #label>
                  <div style="display: flex">
                    <van-rate
                      v-if="item.apply_challenge == 2"
                      v-model="item.rate"
                      :size="22"
                      color="#CD853F"
                      void-icon="good-job"
                      icon="good-job"
                      void-color="#eee"
                      :count="3"
                      readonly
                      allow-half
                    >
                    </van-rate>
                    <van-rate
                      v-else-if="item.is_review_required == 1"
                      v-model="item.rate"
                      :size="20"
                      color="#DBC8AF"
                      void-icon="like"
                      icon="like"
                      void-color="#eee"
                      :count="3"
                      readonly
                      allow-half
                    />
                    <van-rate
                      v-else
                      v-model="item.rate"
                      :size="20"
                      color="#ffd21e"
                      void-icon="like"
                      icon="like"
                      void-color="#eee"
                      :count="3"
                      readonly
                      allow-half
                    />
                    <div
                      style="
                        margin-top: 3%;
                        margin-left: 0.2rem;
                        color: lightgray;
                      "
                      v-if="showRatePlus[index] && item.is_review_required == 1"
                    >
                      + {{ formattedRate(item.rate) }}
                    </div>
                    <div
                      style="margin-top: 3%; margin-left: 0.2rem"
                      v-if="
                        showRatePlus[index] && !item.is_review_required == 1
                      "
                    >
                      + {{ formattedRate(item.rate) }}
                    </div>
                  </div>

                  <div
                    v-if="item.is_review_required == 1"
                    style="
                      margin-left: 4px;
                      margin-top: 7px;
                      width: 120%;
                      font-size: 12px;
                      color: lightgray;
                    "
                  >
                    {{ item.create_time }}
                  </div>
                  <div
                    v-else
                    style="
                      margin-left: 4px;
                      margin-top: 7px;
                      width: 120%;
                      font-size: 12px;
                    "
                  >
                    {{ item.create_time }}
                  </div>
                  <div style="margin-top: 1rem">
                    <div v-if="item.is_review_required == 1">
                      <van-progress
                        color="lightblue"
                        :percentage="item.progressPercentage"
                        stroke-width="2"
                        :show-pivot="true"
                        :inactive="item.progressPercentage === 100"
                      />
                    </div>
                    <div v-else>
                      <van-progress
                        v-if="item.alias.includes('庆典')"
                        color="#F4C244"
                        :percentage="item.progressPercentage"
                        stroke-width="2"
                        :show-pivot="true"
                        :inactive="item.progressPercentage === 100"
                      />
                      <van-progress
                        v-else
                        :percentage="item.progressPercentage"
                        stroke-width="2"
                        :show-pivot="true"
                        :inactive="item.progressPercentage === 100"
                      />
                    </div>
                  </div>
                </template>

                <template #right-icon>
                  <van-checkbox
                    v-if="isMultiSelectMode & (item.rate >= 3)"
                    :checked="selectedItems.includes(index)"
                    @click.stop="selectItem(index)"
                  />
                  <div v-else>
                    <div
                      v-if="item.is_pinned && item.rate < 3"
                      style="display: flex; flex-direction: column"
                    >
                      <van-icon name="link-o" style="margin-bottom: 1.7rem" />
                      <van-icon name="arrow" style="margin-bottom: 1.95rem" />
                    </div>
                    <div v-else>
                      <van-icon name="arrow" style="margin-bottom: 1rem" />
                    </div>
                  </div>
                </template>
              </van-cell>
            </div>
            <div v-if="item.type == 2 || item.type == 3">
              <van-cell
                is-link
                center
                clickable
                @click="gotoItem(index)"
                class="custom-cell"
              >
                <template #icon>
                  <img
                    v-if="item.rate < 3 && (item.type == 0 || item.type == 1)"
                    src="../assets/item_list.png"
                    style="width: 27px; height: auto; margin-right: 0.5rem"
                    alt="Item List"
                  />
                  <img
                    v-if="item.rate >= 3 && (item.type == 0 || item.type == 1)"
                    src="../assets/item_list_complete.png"
                    style="width: 27px; height: auto; margin-right: 0.5rem"
                    alt="Item List Complete"
                  />
                  <img
                    v-if="item.type == 3"
                    src="../assets/item_list_complete.png"
                    style="width: 27px; height: auto; margin-right: 0.5rem"
                    alt="Item List Complete"
                  />
                  <img
                    v-if="item.type == 2"
                    src="../assets/item_list.png"
                    style="width: 27px; height: auto; margin-right: 0.5rem"
                    alt="Item List"
                  />
                </template>

                <template #title>
                  <div
                    v-if="item.swipe == 0"
                    style="display: flex; align-items: flex-start; width: 160%"
                  >
                    <div style="margin-bottom: 7px; font-weight: 700">
                      {{ processedTitle(item.title) }}
                    </div>
                  </div>

                  <div
                    v-else
                    style="display: flex; align-items: flex-start; width: 160%"
                  >
                    <div style="margin-bottom: 0px; font-weight: 700">
                      {{ processedTitle(item.title) }}
                    </div>
                  </div>
                </template>

                <template #value>
                  <div style="font-size: 12px">
                    <div style="margin-top: 0rem">
                      {{ item.answers.length }}词
                    </div>
                  </div>
                </template>

                <template #label>
                  <van-rate
                    v-model="item.rate"
                    :size="50"
                    color="#ffd21e"
                    void-icon="chart-trending-o"
                    icon="chart-trending-o"
                    void-color="#eee"
                    :count="1"
                    readonly
                    allow-half
                  />
                  <div
                    style="
                      margin-left: 4px;
                      margin-top: 7px;
                      width: 140%;
                      font-size: 12px;
                    "
                  >
                    <div>{{ item.create_time }}</div>
                  </div>
                </template>
              </van-cell>
            </div>
          </div>
        </van-list>
      </van-tab>

      <div v-for="(item, index) in tabsName" :key="index">
        <van-tab :title="item">
          <van-list
            v-model="loadingOriginalData"
            :finished="finishedOriginalData"
            finished-text="没有更多了"
            @load="onLoadOriginalData(item)"
          >
            <div v-if="item && item.includes('庆典')">
              <van-cell
                center
                is-link
                clickable
                value="限时任务"
                class="custom-cell"
              >
                <template #icon>
                  <img
                    src="../assets/Boonie Bears/ad.png"
                    style="
                      width: 100px;
                      height: auto;
                      margin-right: 0.5rem;
                      margin-bottom: 0.5rem;
                    "
                    alt="Item List"
                  />
                </template>
                <template #title>
                  <div
                    style="
                      margin-bottom: 2.9rem;
                      font-weight: 700;
                      color: #f4c241;
                      width: 135%;
                    "
                  >
                    限定技能-不灭意志
                  </div>
                </template>
                <template #label>
                  <div style="width: 135%; font-size: smaller">
                    期末考试前完成本组试题
                  </div>
                  <div
                    style="width: 80%; margin-top: 0.2rem; font-size: smaller"
                  >
                    免费获得
                  </div>
                </template>
              </van-cell>
            </div>

            <div v-for="(item, index) in originalData" :key="index">
              <div v-if="item.type !== 2 && item.type != 3">
                <van-cell
                  is-link
                  center
                  clickable
                  @click="
                    isMultiSelectMode ? selectItem(index) : gotoItem(index)
                  "
                  class="custom-cell"
                >
                  <template #icon>
                    <div v-if="item.alias.includes('庆典')">
                      <img
                        v-if="item.rate < 3"
                        src="../assets/Boonie Bears/item_list.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List Complete"
                      />
                      <img
                        v-else
                        src="../assets/item_list_complete.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        class="image-middle"
                        alt="Item List Complete"
                      />
                    </div>
                    <div v-else>
                      <div v-if="item.is_review_required == 1">
                        <img
                          src="../assets/item_list_complete_reviewed.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          class="image-middle"
                          alt="Item List"
                        />
                      </div>
                      <div v-else>
                        <img
                          v-if="
                            item.rate < 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                        <img
                          v-if="
                            item.rate >= 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 3"
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 2"
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </div>
                    </div>
                  </template>

                  <template #title>
                    <div
                      v-if="item.swipe == 0"
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <img
                        v-show="item.alias.includes('庆典')"
                        src="../assets/Boonie Bears/edge.png"
                        style="
                          width: 25px;
                          height: auto;
                          margin-top: -0.2rem;
                          margin-left: -2.2rem;
                          margin-right: 0.7rem;
                        "
                      />
                      <div style="margin-bottom: 7px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                      <van-badge
                        content="Game"
                        color="lightgray"
                        style="margin-left: -20px"
                      />
                    </div>

                    <div
                      v-else
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <img
                        v-show="item.alias.includes('庆典')"
                        src="../assets/Boonie Bears/edge.png"
                        style="
                          width: 25px;
                          height: auto;
                          margin-top: -0.2rem;
                          margin-left: -2.2rem;
                          margin-right: 0.7rem;
                        "
                      />
                      <div
                        v-if="item.is_review_required == 1"
                        style="
                          margin-bottom: 7px;
                          font-weight: 700;
                          color: lightgray;
                        "
                      >
                        {{ processedTitle(item.title) }}
                      </div>
                      <div v-else style="margin-bottom: 7px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                      <van-badge
                        v-if="item.is_review_required == 1"
                        color="#D8A7B1"
                        content="Game"
                        style="margin-left: -20px"
                      />
                      <van-badge
                        v-else
                        content="Game"
                        style="margin-left: -20px"
                      />
                    </div>
                  </template>

                  <template #value>
                    <div
                      v-if="item.is_review_required == 1"
                      style="font-size: 12px; color: lightgray"
                    >
                      <div style="display: flex; justify-content: flex-end">
                        尝试了
                        <div style="font-weight: 700; color: bisque">
                          {{ item.attempt }}
                        </div>
                        次
                      </div>

                      <div style="margin-top: 0.5rem">
                        {{ item.answers.length }}词
                      </div>
                    </div>
                    <div v-else style="font-size: 12px">
                      <div style="display: flex; justify-content: flex-end">
                        尝试了
                        <div style="font-weight: 700; color: red">
                          {{ item.attempt }}
                        </div>
                        次
                      </div>

                      <div style="margin-top: 0.5rem">
                        {{ item.answers.length }}词
                      </div>
                    </div>

                    <div v-if="item.view == 0">
                      <van-button
                        style="color: gray; border: none"
                        size="mini"
                        @click.stop="viewAnswer(item, index)"
                        class="button-container2"
                      >
                        <span class="button-content">
                          <img
                            src="../assets/close_eye.png"
                            alt="Icon"
                            class="button-icon"
                          />
                        </span>
                      </van-button>
                    </div>

                    <div v-else>
                      <van-button
                        style="color: red; font-weight: 700; border: none"
                        size="small"
                        @click.stop="viewAnswer(item, index)"
                        class="button-container2"
                      >
                        <span class="button-content">
                          <img
                            src="../assets/eye.png"
                            alt="Icon"
                            class="button-icon"
                            style="margin-right: 0.1rem"
                          />
                          * {{ item.view }}
                        </span>
                      </van-button>
                    </div>
                  </template>

                  <template #label>
                    <div style="display: flex">
                      <van-rate
                        v-if="item.is_review_required == 1"
                        v-model="item.rate"
                        :size="20"
                        color="#DBC8AF"
                        void-icon="like"
                        icon="like"
                        void-color="#eee"
                        :count="3"
                        readonly
                        allow-half
                      />
                      <van-rate
                        v-else
                        v-model="item.rate"
                        :size="20"
                        color="#ffd21e"
                        void-icon="like"
                        icon="like"
                        void-color="#eee"
                        :count="3"
                        readonly
                        allow-half
                      />
                      <div
                        style="
                          margin-top: 3%;
                          margin-left: 0.2rem;
                          color: lightgray;
                        "
                        v-if="
                          showRatePlus[index] && item.is_review_required == 1
                        "
                      >
                        + {{ formattedRate(item.rate) }}
                      </div>
                      <div
                        style="margin-top: 3%; margin-left: 0.2rem"
                        v-if="
                          showRatePlus[index] && !item.is_review_required == 1
                        "
                      >
                        + {{ formattedRate(item.rate) }}
                      </div>
                    </div>
                    <div
                      v-if="item.is_review_required == 1"
                      style="
                        margin-left: 4px;
                        margin-top: 7px;
                        width: 140%;
                        font-size: 12px;
                        color: lightgray;
                      "
                    >
                      <div>{{ item.create_time }}</div>
                    </div>
                    <div
                      v-else
                      style="
                        margin-left: 4px;
                        margin-top: 7px;
                        width: 140%;
                        font-size: 12px;
                      "
                    >
                      <div>{{ item.create_time }}</div>
                    </div>
                    <div style="margin-top: 1rem">
                      <div v-if="item.is_review_required == 1">
                        <van-progress
                          color="lightblue"
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                      </div>
                      <div v-else>
                        <van-progress
                          v-if="item.alias.includes('庆典')"
                          color="#F4C244"
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                        <van-progress
                          v-else
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                      </div>
                    </div>
                  </template>

                  <template #right-icon>
                    <van-checkbox
                      v-if="isMultiSelectMode & (item.rate >= 3)"
                      :checked="selectedItems.includes(index)"
                      @click.stop="selectItem(index)"
                    />
                    <div v-else>
                      <van-icon name="arrow" style="margin-bottom: 1rem" />
                    </div>
                  </template>
                </van-cell>
              </div>

              <div v-if="item.type == 2 || item.type == 3">
                <van-cell
                  is-link
                  center
                  clickable
                  @click="gotoItem(index)"
                  class="custom-cell"
                >
                  <template #icon>
                    <img
                      v-if="item.rate < 3 && (item.type == 0 || item.type == 1)"
                      src="../assets/item_list.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      alt="Item List"
                    />
                    <img
                      v-if="
                        item.rate >= 3 && (item.type == 0 || item.type == 1)
                      "
                      src="../assets/item_list_complete.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      alt="Item List Complete"
                    />
                    <img
                      v-if="item.type == 3"
                      src="../assets/item_list_complete.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      alt="Item List Complete"
                    />
                    <img
                      v-if="item.type == 2"
                      src="../assets/item_list.png"
                      style="width: 27px; height: auto; margin-right: 0.5rem"
                      alt="Item List"
                    />
                  </template>

                  <template #title>
                    <div
                      v-if="item.swipe == 0"
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <div style="margin-bottom: 7px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                    </div>

                    <div
                      v-else
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <div style="margin-bottom: 0px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                    </div>
                  </template>

                  <template #value>
                    <div style="font-size: 12px">
                      <div style="margin-top: 0rem">
                        {{ item.answers.length }}词
                      </div>
                    </div>
                  </template>

                  <template #label>
                    <van-rate
                      v-model="item.rate"
                      :size="50"
                      color="#ffd21e"
                      void-icon="chart-trending-o"
                      icon="chart-trending-o"
                      void-color="#eee"
                      :count="1"
                      readonly
                      allow-half
                    />
                    <div
                      style="
                        margin-left: 4px;
                        margin-top: 7px;
                        width: 140%;
                        font-size: 12px;
                      "
                    >
                      <div>{{ item.create_time }}</div>
                    </div>
                  </template>
                </van-cell>
              </div>
            </div>
          </van-list>
        </van-tab>
      </div>
    </van-tabs>

    <!-- 显示答案 -->
    <van-popup
      closeable
      v-model:show="showAnswerSheet"
      position="bottom"
      :style="{ height: '90%' }"
    >
      <div
        style="font-size: 18px; font-weight: 700; margin: 1rem 1rem 0.8rem 1rem"
      >
        挑战前复习（试题部分不提供预习）
      </div>
      <div
        @click="toggleCheckSelf"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-right: 1rem;
        "
      >
        <div
          style="
            font-size: 13px;
            margin: 0.5rem 1rem 0.5rem 1rem;
            font-weight: 700;
          "
        >
          {{ answerSheetList.length }}词
        </div>
        <div style="display: flex">
          <div
            style="font-size: 12px; margin-right: 0.2rem; margin-top: 0.2rem"
          >
            点击自查词汇
          </div>
          <van-icon
            :name="selfCheck ? 'eye-o' : 'eye'"
            style="margin-right: 1rem; margin-top: 0.1rem"
            size="20"
          />
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem; margin-left: -0.2rem">
        <van-cell-group>
          <div v-for="(item, index) in answerSheetList" :key="index">
            <div v-if="item.排除 !== '试题'">
              <van-cell
                :title="`${index + 1}. ${item.英文}`"
                :value="item.中文"
                @click="speakWord(item.英文, item.正确答案)"
              >
                <div v-show="selfCheck">
                  <!-- 检查 spellWordsList 是否包含当前 item 的英文 -->
                  <van-tag
                    mark
                    v-if="
                      spellWordsList.some(
                        (spellItem) => spellItem.英文 === item.英文
                      )
                    "
                    type="danger"
                  >
                    拼
                  </van-tag>
                  <van-tag mark v-if="item.排除 === '手写'" type="warning">
                    写
                  </van-tag>
                  {{ item.中文 }}
                  <img
                    src="../assets/speaker.png"
                    style="width: 12px; height: auto"
                  />
                </div>
              </van-cell>
            </div>
          </div>
        </van-cell-group>
      </van-cell-group>
    </van-popup>

    <!-- 是否先查看答案 -->
    <div>
      <van-dialog
        v-model:show="showCheckAnswerSheet"
        title="是否需要复习答案？"
        class="custom-dark-dialog-checkAnswer"
        :before-close="handleCloseCheckAnswer"
      >
        <template #default>
          <div class="dialog-content">
            <p>挑战前务必仔细复习词汇</p>
            <p>
              后续点击
              <img
                src="../assets/close_eye.png"
                alt="Icon"
                class="button-icon"
                style="margin-right: 0.2rem"
              />查看
            </p>
            <van-icon
              name="cross"
              class="close-icon-checkAnswer"
              @click="handleCloseClickCheckAnswer"
            />
            <p
              style="color: lightcoral"
              v-if="
                originalData[gotoIndex]['is_pinned'] &&
                originalData[gotoIndex]['rate'] < 3
              "
            >
              <van-icon name="link-o" /> 老师置顶了这组试题，希望你尽快完成
            </p>
          </div>
        </template>
        <template #footer>
          <div class="custom-button-checkAnswer-group">
            <van-button
              size="large"
              type="danger"
              plain
              hairline
              text="开启挑战"
              class="custom-button-checkAnswer"
              @click="handleCancelCheckAnswer"
            />
            <van-button
              size="large"
              type="primary"
              plain
              hairline
              text="查看答案"
              class="custom-button-checkAnswer"
              @click="handleConfirmCheckAnswer"
            />
          </div>
        </template>
      </van-dialog>
    </div>

    <!-- 日常周常任务 -->
    <!-- <van-badge
      v-if="flagDaily"
      :content="dailyTimes"
      :style="badgeStyle"
      color="#ff9999"
    >
      <div class="child">
        <van-floating-bubble
          class="dailyFloat"
          v-if="flagDaily"
          axis="xy"
          magnetic="x"
          v-model:offset="offsetDaily"
          icon="diamond-o"
          @click="popupDaily()"
        />
      </div>
    </van-badge> -->

    <!-- 单词表textbook -->
    <van-floating-bubble
      axis="xy"
      magnetic="x"
      icon="vip-card-o"
      @click="showTextbook"
    />

    <van-popup
      closeable
      v-model:show="showTextbookPop"
      position="bottom"
      :style="{ height: '90%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
    >
      <div style="display: flex; align-items: center">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          个人定制单词手册
        </div>
        <div style="font-size: 12px; color: red; margin-top: 0.4rem">
          单击显示单词讲解
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem">
        <van-cell-group>
          <div v-for="(item, index) in textbookData" :key="index">
            <van-cell
              clickable
              @click="getVocabularyMeaning(index)"
              :title="item.英文"
              :value="item.答案"
              :label="`累计${item.times}次`"
              is-link
            >
            </van-cell>
          </div>
        </van-cell-group>
      </van-cell-group>
    </van-popup>

    <!-- vocabulary meaning -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="meaningShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: red;
          margin-bottom: 1rem;
        "
      >
        {{ meaningTitle }}
      </div>
      <div v-if="meaningData['教材'] && meaningData['教材'].length > 0">
        <div v-for="(item, index) in meaningData['教材']" :key="index">
          <div style="display: flex; font-weight: 700">
            <div>{{ item["教材"] }}</div>
            &nbsp;&nbsp;&nbsp;
            <div style="margin-top: 0.07rem">{{ item["模块"] }}</div>
          </div>
          <div style="font-size: 14px; margin-top: 0.3rem">
            {{ item["中文"] }}
          </div>
          <Divider></Divider>
        </div>
      </div>
      <div v-else>
        <div style="font-weight: 700; margin-bottom: 0.3rem">教材：</div>
        <div>无</div>
        <Divider></Divider>
      </div>
      <div style="display: flex; justify-content: space-between">
        <div style="font-weight: 700; margin-bottom: 0.3rem">天津3500:</div>
        <img
          :src="cover3500Image"
          style="width: 40px; height: auto"
          fit="cover"
        />
      </div>
      <div style="white-space: pre-wrap; font-size: 14px">
        {{ meaningData["高考"]["中文"] }}
      </div>
    </van-popup>

    <!-- 模式选择 -->
    <van-dialog
      v-model:show="showChooseMode"
      title="模式选择"
      :confirmButtonText="confirmButtonText"
      cancelButtonText="游戏模式"
      cancelButtonColor="#ee0a24"
      show-cancel-button
      @confirm="handleRegularMode"
      @cancel="handleSwipeMode"
      :confirmButtonDisabled="!isRegularModeEnabled"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            <div
              style="
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                width: 100%;
              "
            >
              <div style="font-size: 16px; font-weight: bold">模式选择</div>
              <div
                v-if="consumeText"
                style="
                  position: absolute;
                  right: 35px;
                  font-size: 12px;
                  display: flex;
                  align-items: center;
                  color: #1a89fa;
                "
              >
                {{ consumeText }}
                <span style="font-size: 12px; margin-left: 4px">💎</span>
              </div>
            </div>
            <div
              style="
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-top: 0rem;
                font-size: smaller;
              "
            >
              <div
                style="
                  color: lightcoral;
                  font-size: smaller;
                  margin-top: -0.1rem;
                "
                v-if="
                  originalData[gotoIndex]['is_pinned'] &&
                  originalData[gotoIndex]['rate'] < 3
                "
              >
                <van-icon name="link-o" /> 老师置顶了这组试题，希望你尽快完成
              </div>

              <div
                style="
                  display: flex;
                  align-items: center;
                  margin-bottom: 0.5rem;
                  margin-top: 0.2rem;
                "
              >
                <div :style="noneOfAboveStyle">去除本次背诵“以上都不对”</div>
                <van-switch
                  :disabled="disabledNoneOfAbove"
                  style="margin-left: 1rem"
                  :model-value="checkedNoneOfAbove"
                  @update:model-value="onUpdateNoneOfAbove"
                  size="20px"
                />
              </div>

              <div style="display: flex; align-items: center">
                <div :style="spellStyle">去除本次背诵“拼写”</div>
                <van-switch
                  :disabled="disabledSpell"
                  style="margin-left: 1rem"
                  :model-value="checkedSpell"
                  @update:model-value="onUpdateCheckedSpell"
                  size="20px"
                />
              </div>
            </div>
            <div style="width: 90%; margin-left: 1rem">
              <van-field
                v-model="result"
                is-link
                readonly
                name="picker"
                label="挑战赛"
                placeholder="需要老师开启"
                @click="applyforChallenge()"
              />
            </div>

            <van-progress
              style="margin-top: 0.5rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="closeMode()"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
    </van-dialog>

    <!-- 复习模式选择 -->
    <van-dialog
      v-model:show="showReviewMode"
      title="模式选择"
      confirmButtonText="复习模式"
      @confirm="handleReviewMode"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            再次唤醒我吧！
            <van-progress
              style="margin-top: 1rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="showReviewMode = false"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
    </van-dialog>

    <!-- 考试模式选择 -->
    <van-dialog
      v-model:show="showChooseTestMode"
      title="模式选择"
      confirmButtonText="考试模式"
      @confirm="handleRegularMode"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            别无选择
            <van-progress
              style="margin-top: 0.5rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="showChooseTestMode = false"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
    </van-dialog>

    <!-- 临考模式 -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="preExamShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: black;
          margin-bottom: 0.5rem;
        "
      >
        多组复习
        <div
          style="font-size: 12px; color: red; margin: 0.1rem 0 -0.2rem -0.1rem"
        >
          👇 下拉到底部开启旅途
        </div>
      </div>

      <van-cell-group
        v-for="(item, index) in dataPreExam"
        :key="index"
        style="margin-left: -1rem"
      >
        <van-cell
          :title="`${index + 1}. ${item.英文}`"
          :value="item.正确答案"
          :label="item.type"
          @click="speakWord(item.英文, item.正确答案)"
          clickable
        >
          <template #value>
            <div>
              {{ item.正确答案 }}
              <img
                src="../assets/speaker.png"
                style="width: 12px; height: auto; margin-left: 0.2rem"
              />
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-button
        style="margin-bottom: 0.5rem; margin-right: 0.1rem"
        block
        type="success"
        plain
        @click="startPreExam"
        >开启旅程</van-button
      >
    </van-popup>

    <!-- 复习模式 -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="reviewShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: black;
          margin-bottom: 0.5rem;
        "
      >
        唤醒复习
        <div
          style="font-size: 12px; color: red; margin: 0.1rem 0 -0.2rem -0.1rem"
        >
          👇 下拉到底部开启唤醒之旅
        </div>
      </div>

      <van-cell-group
        v-for="(item, index) in dataReview2"
        :key="index"
        style="margin-left: -1rem"
      >
        <div v-if="item.排除 != '试题'">
          <van-cell
            :title="`${index + 1}. ${item.英文}`"
            :value="item.正确答案"
            :label="item.type.toString()"
            @click="speakWord(item.英文, item.正确答案)"
            clickable
          >
            <template #value>
              <div>
                <van-tag mark v-if="item.排除 === '手写'" type="warning">
                  写
                </van-tag>
                {{ item.正确答案 }}
                <img
                  src="../assets/speaker.png"
                  style="width: 12px; height: auto; margin-left: 0.2rem"
                />
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>

      <van-button
        style="margin-bottom: 0.5rem; margin-right: 0.1rem"
        block
        type="success"
        plain
        @click="startReview"
        >开启旅程</van-button
      >
    </van-popup>

    <!-- 复习列表 -->
    <van-popup
      closeable
      round=""
      v-model:show="showReviewList"
      position="bottom"
      :style="{ height: '95%' }"
    >
      <div style="display: flex">
        <div
          style="font-size: 18px; font-weight: 700; margin: 1rem 0 0.5rem 1rem"
        >
          待复习列表
        </div>
        <div
          style="font-size: 11px; color: #8b0000; margin: 1.5rem 0 0rem 0.5rem"
        >
          <div style="display: flex; gap: 1rem">
            <div style="color: #ff0000">红色获得1钻石</div>
            <div style="color: #ff8c00">橙色获得2钻石</div>
            <div style="color: #0000ff">蓝获得2钻石</div>
          </div>
        </div>
      </div>

      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      ></div>

      <van-list
        v-model="loadingReviewData"
        :finished="finishedReviewData"
        finished-text="没有更多了"
        @load="onLoadReviewData"
      >
        <div v-for="(item, index) in reviewList" :key="index">
          <van-cell is-link center clickable @click="gotoReview(index)">
            <template #icon>
              <img
                src="../assets/item_list_complete_reviewed.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List Complete"
              />
            </template>
            <template #title>
              <div
                v-if="item.is_review_required == 1"
                style="display: flex; align-items: flex-start; width: 160%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="一次复习"
                  color="#FF0000"
                  style="margin-left: -20px"
                />
              </div>

              <div
                v-if="item.is_review_required == 2"
                style="display: flex; align-items: flex-start; width: 160%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="二次复习"
                  color="#FF8C00"
                  style="margin-left: -20px"
                />
              </div>

              <div
                v-if="item.is_review_required == 3"
                style="display: flex; align-items: flex-start; width: 160%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="三次复习"
                  color="#0000FF"
                  style="margin-left: -20px"
                />
              </div>
            </template>

            <template #value>
              <div style="font-size: 12px; color: lightgray">
                <div style="display: flex; justify-content: flex-end">
                  尝试了
                  <div style="font-weight: 700; color: red">
                    {{ item.attempt }}
                  </div>
                  次
                </div>

                <div style="margin-top: 0.5rem">
                  {{ item.answers.length }}词
                </div>
              </div>

              <div v-if="item.view == 0">
                <van-button
                  style="color: gray; border: none"
                  size="mini"
                  class="button-container2"
                >
                  <span class="button-content">
                    <img
                      src="../assets/close_eye.png"
                      alt="Icon"
                      class="button-icon"
                    />
                  </span>
                </van-button>
              </div>

              <div v-else>
                <van-button
                  style="color: red; font-weight: 700; border: none"
                  size="small"
                  class="button-container2"
                >
                  <span class="button-content">
                    <img
                      src="../assets/eye.png"
                      alt="Icon"
                      class="button-icon"
                      style="margin-right: 0.1rem"
                    />
                    * {{ item.view }}
                  </span>
                </van-button>
              </div>
            </template>

            <template #label>
              <div style="display: flex">
                <van-rate
                  v-model="item.rate"
                  :size="20"
                  color="#DBC8AF"
                  void-icon="like"
                  icon="like"
                  void-color="#eee"
                  :count="3"
                  readonly
                  allow-half
                />
                <div
                  style="margin-top: 3%; margin-left: 0.2rem"
                  v-if="showRatePlus[index]"
                >
                  + {{ formattedRate(item.rate) }}
                </div>
              </div>

              <div
                style="
                  margin-left: 4px;
                  margin-top: 7px;
                  width: 120%;
                  font-size: 12px;
                  color: lightgray;
                "
              >
                {{ item.create_time }}
              </div>
              <div style="margin-top: 1rem">
                <van-progress
                  color="lightblue"
                  :percentage="item.progressPercentage"
                  stroke-width="2"
                  :show-pivot="true"
                  :inactive="item.progressPercentage === 100"
                />
              </div>
            </template>
          </van-cell>
        </div>
      </van-list>
    </van-popup>

    <!-- 日常任务列表 -->
    <van-popup
      closeable
      round=""
      v-model:show="showDailyList"
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        每周任务
      </div>
      <div style="margin: -0.5rem 0 1rem 1rem; font-size: smaller; color: gray">
        每完成一个任务可获得2颗钻石💎
      </div>

      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      ></div>

      <van-list>
        <div v-for="(item, index) in dailyList" :key="index">
          <van-cell is-link center clickable @click="gotoDaily(index)">
            <template #icon>
              <img
                src="../assets/item_list_complete.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List Complete"
              />
            </template>

            <template #title>
              <div style="display: flex; align-items: flex-start; width: 160%">
                <div style="margin-bottom: 7px; font-weight: 700; color: black">
                  {{ item.alias }}
                </div>
                <van-badge
                  content="Daily"
                  color="red"
                  style="margin-left: -20px"
                />
              </div>
            </template>

            <template #label>
              {{ processedTitle(item.title) }}
            </template>
          </van-cell>
        </div>
      </van-list>
    </van-popup>

    <!-- 弹幕 -->
    <van-barrage
      v-model="listBarrage"
      style="
        position: absolute;
        width: 100%;
        height: 150px;
        z-index: 99999;
        top: 0;
        pointer-events: none;
      "
    >
      <div class="video" style="width: 100%; height: 150px"></div>
    </van-barrage>

    <!-- 庆祝三星 -->
    <div v-if="showStars" class="stars">
      <div class="star">🐻</div>
      <div class="star" style="animation-delay: 0.5s">🐻</div>
      <div class="star" style="animation-delay: 1s">🐻</div>
    </div>

    <!-- 预热庆祝 -->
    <bearWarmup ref="bearWarmupRef" v-if="showbearWarmup" />

    <angryWolf ref="wolfBackRef" :dialogPosition="dialogPosition" />
    <missyou ref="missyouRef" :days="missDays" />
    <challengeConfirm
      ref="challengeConfirmRef"
      @confirm="handleConfirmChallenge"
      @cancel="handleCancelChallenge"
    />
    <threeStar ref="threeStarRef" />
    <loading v-if="isLoading" />
    <getPassive
      ref="getPassiveRef"
      v-if="showPassiveMagic"
      :textGive="'不灭的意志'"
    />
  </div>
</template>




<style>
.flashing-icon {
  animation: flash 0.4s infinite alternate;
  margin-left: 1rem;
}
@keyframes flash {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}
.progress-transition .van-progress__portion {
  transition: width 0.5s ease;
}

.close-icon-checkAnswer {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: black;
  cursor: pointer;
  font-size: 15px;
}
.dialog-content {
  margin: 20px;
  font-size: 14px;
  text-align: center;
}
.custom-button-checkAnswer-group {
  display: flex;
}

.container {
  overflow: visible; /* 确保弹幕不会被裁剪 */
  width: 100%;
  margin: 0 auto;
  padding: 0;
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.stars {
  position: fixed;
  top: 40%;
  left: 65%;
  transform: translate(-50%, -50%);
  display: flex; /* 使用flex布局让星星横向排列 */
  gap: 20px; /* 星星之间的间距 */
}

.star {
  transform: scale(0); /* 开始时大小为0 */
  font-size: 5rem; /* 星星的基础大小 */
  color: gold;
  opacity: 0; /* 开始时透明度为0 */
  animation: starFadeInOut 5s forwards; /* 动画名称，持续时间，以及动画结束时的状态 */
}

@keyframes starFadeInOut {
  0%,
  100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1); /* 中间状态最大 */
    opacity: 1;
  }
}
.button-container2 {
  position: relative;
  margin-top: 0.3rem;
  padding-right: 0px;
}

.button-content {
  display: flex;
  align-items: center;
}

.button-icon {
  width: 16px;
  height: auto;
}

.custom-dark-dialog .van-dialog__message {
  color: red; /* 设置内容颜色 */
  font-weight: 700;
}
.custom-dark-dialog .van-dialog__header {
  background-color: white; /* 设置暗黑色背景 */
}

.custom-dark-dialog .van-dialog__footer {
  border-top-color: #444; /* 设置底部边框颜色为暗色 */
  background-color: gray; /* 设置暗黑色背景 */
}
.custom-container {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 93.5%; /* 设置宽度为屏幕的94% */

  font-size: 13px;
}

.custom-cell {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 95%; /* 设置宽度为屏幕的95% */
  /* max-width: 1200px; */
  font-size: 13px;
}

@media (max-width: 768px) {
  .custom-container {
    width: 92.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

@media (max-width: 430px) {
  .custom-container {
    width: 90.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

.pin-background {
  background-color: rgba(245, 245, 245, 0.5); /* 浅灰色背景 */
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(200, 200, 200, 0.1) 5px,
    /* 更浅的灰色线条 */ rgba(245, 245, 245, 0.5) 10px /* 浅灰色交错 */
  );
}

.van-dropdown-menu {
  --van-dropdown-menu-height: 40px;
  --van-dropdown-menu-shadow: 0 0 0 0;
  --van-dropdown-menu-background: transparent;
  width: 20%;
  margin-bottom: -0.5rem;
  margin-top: -0.5rem;
}
.van-dropdown-menu__title {
  padding-left: 0.3rem;
  background-color: transparent;
  font-size: 13px !important;
}
.dailyFloat.van-floating-bubble {
  width: 40px !important; /* 矩形宽度 */
  height: 50px !important; /* 矩形高度 */
  border-radius: 8px !important; /* 直角矩形，去掉圆角 */
  z-index: 0;
  background: linear-gradient(
    45deg,
    rgba(255, 79, 79, 0.3),
    rgba(240, 166, 202, 0.3)
  ) !important;
}

/* 确保图标居中 */
.dailyFloat .van-floating-bubble__icon {
  margin: auto;
  font-size: 28px !important;
}
.van-badge {
  z-index: 9999; /* 确保 badge 位于其他元素之上 */
}

.dailyFloat.van-floating-bubble {
  z-index: 10000; /* 提高 floating bubble 层级 */
}
.bubble-container {
  position: relative;
  display: inline-block;
}
</style>
